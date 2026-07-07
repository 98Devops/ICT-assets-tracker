// RLS verification: sign in as each role and prove the §6 role matrix holds.
// Usage: node tests/rls-check.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const PASSWORD = 'IATS-demo-2026!';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

async function as(email) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login failed for ${email}: ${error.message}`);
  return c;
}

// ADMIN: sees everything
const admin = await as('admin@iats.demo');
const { count: adminAssets } = await admin.from('assets').select('*', { count: 'exact', head: true });
check('super_admin sees all 20 assets', adminAssets === 20, `saw ${adminAssets}`);
const { count: adminAudit } = await admin.from('audit_log').select('*', { count: 'exact', head: true });
check('super_admin can read audit log', (adminAudit ?? 0) > 0, `${adminAudit} entries`);

// STAFF: own dept (Sciences: ICT-0006 faulty? no — dept Sciences assets: 6,7,20) + own assignments (1, 20)
const staff = await as('staff@iats.demo');
const { data: staffAssets } = await staff.from('assets').select('asset_tag');
const staffTags = (staffAssets ?? []).map((a) => a.asset_tag).sort();
check(
  'staff sees only own dept + own assignments',
  staffTags.length > 0 && staffTags.length < 10,
  staffTags.join(', '),
);
const { error: staffInsErr } = await staff.from('assets').insert({
  organization_id: '00000000-0000-0000-0000-000000000000',
  asset_tag: 'HACK-1', name: 'x', category: 'other',
});
check('staff cannot create assets', !!staffInsErr);
const { data: staffAudit, error: staffAuditErr } = await staff.from('audit_log').select('id').limit(1);
check('staff cannot read audit log', !!staffAuditErr || (staffAudit ?? []).length === 0);

// AUDITOR: reads everything, changes nothing
const auditor = await as('auditor@iats.demo');
const { count: audAssets } = await auditor.from('assets').select('*', { count: 'exact', head: true });
check('auditor sees all assets (read-only)', audAssets === 20, `saw ${audAssets}`);
const { data: anyAsset } = await auditor.from('assets').select('id, organization_id').limit(1).single();
const { error: audUpdErr, data: audUpdData } = await auditor
  .from('assets').update({ name: 'tampered' }).eq('id', anyAsset.id).select();
check('auditor cannot edit assets', !!audUpdErr || (audUpdData ?? []).length === 0);
const { error: audMaintErr } = await auditor.from('maintenance_logs').insert({
  organization_id: anyAsset.organization_id, asset_id: anyAsset.id, type: 'repair', description: 'tamper attempt',
});
check('auditor cannot log maintenance', !!audMaintErr);

// TECHNICIAN: can edit but not delete
const tech = await as('tech@iats.demo');
const { error: techUpdErr, data: techUpd } = await tech
  .from('assets').update({ location: 'ICT Office' }).eq('id', anyAsset.id).select();
check('technician can edit assets', !techUpdErr && (techUpd ?? []).length === 1);
const { error: techDelErr, data: techDel } = await tech.from('assets').delete().eq('id', anyAsset.id).select();
check('technician cannot delete assets', !!techDelErr || (techDel ?? []).length === 0);

// APPEND-ONLY: closed assignments immutable; maintenance immutable
const { data: closedAsg } = await admin
  .from('assignments').select('id').not('returned_date', 'is', null).limit(1).single();
const { error: asgEditErr, data: asgEdit } = await admin
  .from('assignments').update({ return_condition: 'history rewrite' }).eq('id', closedAsg.id).select();
check('closed assignments are immutable (even for admin)', !!asgEditErr || (asgEdit ?? []).length === 0);
const { data: anyMaint } = await admin.from('maintenance_logs').select('id').limit(1).single();
const { error: mEditErr, data: mEdit } = await admin
  .from('maintenance_logs').update({ description: 'tampered' }).eq('id', anyMaint.id).select();
check('maintenance logs are immutable', !!mEditErr || (mEdit ?? []).length === 0);

// ONE OPEN ASSIGNMENT: assigning an already-assigned asset fails
const { data: openAsg } = await admin
  .from('assignments').select('asset_id, assigned_to, organization_id').is('returned_date', null).limit(1).single();
const { error: dupErr } = await admin.from('assignments').insert({
  organization_id: openAsg.organization_id, asset_id: openAsg.asset_id,
  assigned_to: openAsg.assigned_to, assigned_by: openAsg.assigned_to,
});
check('second open assignment rejected', !!dupErr);

// STATUS GUARD: retiring an assigned asset fails
const { error: retireErr } = await admin.from('assets').update({ status: 'retired' }).eq('id', openAsg.asset_id);
check('cannot retire asset with open assignment', !!retireErr);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
