// IATS demo seed — run once after migrations:  node scripts/seed.mjs
// Requires .env with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// minimal .env loader (no dependency)
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch { /* .env optional if vars already set */ }

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO_PASSWORD = 'IATS-demo-2026!';
const ORG_NAME = 'Kumbudzi High School';

const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const daysAgo = (n) => daysFromNow(-n);

async function main() {
  console.log('Seeding IATS demo data…');

  // 1. Organization
  const { data: org, error: orgErr } = await db
    .from('organizations')
    .upsert({ name: ORG_NAME }, { onConflict: 'id' })
    .select()
    .single();
  if (orgErr) throw orgErr;
  const orgId = org.id;
  console.log('org:', orgId);

  // 2. Departments
  const deptNames = ['ICT Department', 'Sciences', 'Administration', 'Library', 'Sports'];
  const { data: depts, error: deptErr } = await db
    .from('departments')
    .upsert(deptNames.map((name) => ({ organization_id: orgId, name })), {
      onConflict: 'organization_id,name',
    })
    .select();
  if (deptErr) throw deptErr;
  const dept = Object.fromEntries(depts.map((d) => [d.name, d.id]));

  // 3. Suppliers
  const { data: suppliers, error: supErr } = await db
    .from('suppliers')
    .insert([
      { organization_id: orgId, name: 'TechZim Solutions', contact: 'sales@techzim.co.zw · +263 77 111 2222' },
      { organization_id: orgId, name: 'Harare Office Systems', contact: 'info@hos.co.zw · +263 71 333 4444' },
      { organization_id: orgId, name: 'FirstPack', contact: 'orders@firstpack.co.zw' },
    ])
    .select();
  if (supErr) throw supErr;
  const sup = suppliers.map((s) => s.id);

  // 4. Users (5 roles)
  const users = [
    { email: 'admin@iats.demo', full_name: 'Tafara Moyo', role: 'super_admin', department: 'ICT Department' },
    { email: 'manager@iats.demo', full_name: 'Rudo Chikafu', role: 'ict_manager', department: 'ICT Department' },
    { email: 'tech@iats.demo', full_name: 'Blessing Ndlovu', role: 'technician', department: 'ICT Department' },
    { email: 'auditor@iats.demo', full_name: 'Grace Mutasa', role: 'auditor', department: 'Administration' },
    { email: 'staff@iats.demo', full_name: 'Tinashe Gumbo', role: 'staff', department: 'Sciences' },
  ];
  const profileIds = {};
  for (const u of users) {
    const { data: created, error } = await db.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    let userId = created?.user?.id;
    if (error) {
      if (!/already/i.test(error.message)) throw error;
      const { data: list } = await db.auth.admin.listUsers();
      userId = list.users.find((x) => x.email === u.email)?.id;
    }
    const { error: pErr } = await db.from('profiles').upsert({
      id: userId,
      organization_id: orgId,
      full_name: u.full_name,
      role: u.role,
      department_id: dept[u.department],
      active: true,
    });
    if (pErr) throw pErr;
    profileIds[u.role] = userId;
    console.log('user:', u.email, u.role);
  }

  // 5. Assets — a story: healthy fleet, some faulty, warranties expiring soon
  const A = (i, extra) => ({
    organization_id: orgId,
    asset_tag: `ICT-${String(i).padStart(4, '0')}`,
    created_by: profileIds.super_admin,
    ...extra,
  });
  const assets = [
    A(1, { name: 'HP ProBook 450 G9', category: 'laptop', serial_number: '5CD2380XKZ', model: 'ProBook 450 G9', supplier_id: sup[0], purchase_date: daysAgo(400), cost: 850, warranty_expiry: daysFromNow(25), status: 'active', condition: 'Good', location: 'Staff Room', department_id: dept['Administration'] }),
    A(2, { name: 'HP ProBook 450 G9', category: 'laptop', serial_number: '5CD2380XLA', model: 'ProBook 450 G9', supplier_id: sup[0], purchase_date: daysAgo(400), cost: 850, warranty_expiry: daysFromNow(25), status: 'active', condition: 'Good', location: 'ICT Lab 1', department_id: dept['ICT Department'] }),
    A(3, { name: 'Dell Latitude 5520', category: 'laptop', serial_number: 'DL5520-88213', model: 'Latitude 5520', supplier_id: sup[1], purchase_date: daysAgo(700), cost: 920, warranty_expiry: daysAgo(30), status: 'faulty', condition: 'Screen flicker', location: 'ICT Office', department_id: dept['ICT Department'], notes: 'Awaiting screen replacement quote.' }),
    A(4, { name: 'Lenovo ThinkCentre M70q', category: 'desktop', serial_number: 'MJ0DGB7T', model: 'ThinkCentre M70q', supplier_id: sup[1], purchase_date: daysAgo(300), cost: 640, warranty_expiry: daysFromNow(65), status: 'active', condition: 'Excellent', location: 'Bursar Office', department_id: dept['Administration'] }),
    A(5, { name: 'Lenovo ThinkCentre M70q', category: 'desktop', serial_number: 'MJ0DGB8A', model: 'ThinkCentre M70q', supplier_id: sup[1], purchase_date: daysAgo(300), cost: 640, warranty_expiry: daysFromNow(65), status: 'active', condition: 'Good', location: 'Library Front Desk', department_id: dept['Library'] }),
    A(6, { name: 'Epson EB-X51 Projector', category: 'projector', serial_number: 'X51-99120', model: 'EB-X51', supplier_id: sup[2], purchase_date: daysAgo(500), cost: 480, warranty_expiry: daysFromNow(12), status: 'active', condition: 'Good — lamp at 60%', location: 'Science Block', department_id: dept['Sciences'] }),
    A(7, { name: 'Epson EB-X51 Projector', category: 'projector', serial_number: 'X51-99164', model: 'EB-X51', supplier_id: sup[2], purchase_date: daysAgo(500), cost: 480, warranty_expiry: daysAgo(10), status: 'in_repair', condition: 'No image — lamp failure', location: 'ICT Office (repair bench)', department_id: dept['Sciences'] }),
    A(8, { name: 'Smart Board MX265', category: 'interactive_screen', serial_number: 'MX265-4471', model: 'MX265', supplier_id: sup[0], purchase_date: daysAgo(200), cost: 2100, warranty_expiry: daysFromNow(500), status: 'active', condition: 'Excellent', location: 'ICT Lab 1', department_id: dept['ICT Department'] }),
    A(9, { name: 'MikroTik hEX S Router', category: 'router', serial_number: 'HEX-77120', model: 'hEX S', supplier_id: sup[0], purchase_date: daysAgo(600), cost: 90, warranty_expiry: daysAgo(200), status: 'active', condition: 'Good', location: 'Server Room', department_id: dept['ICT Department'] }),
    A(10, { name: 'TP-Link 24-Port Switch', category: 'switch', serial_number: 'TL-SG1024-8812', model: 'TL-SG1024', supplier_id: sup[0], purchase_date: daysAgo(600), cost: 110, warranty_expiry: daysAgo(200), status: 'active', condition: 'Good', location: 'Server Room', department_id: dept['ICT Department'] }),
    A(11, { name: 'Hikvision CCTV DVR', category: 'cctv', serial_number: 'HIK-DS7216-3321', model: 'DS-7216HQHI', supplier_id: sup[1], purchase_date: daysAgo(450), cost: 350, warranty_expiry: daysFromNow(40), status: 'active', condition: 'Good', location: 'Admin Block', department_id: dept['Administration'] }),
    A(12, { name: 'ZKTeco Biometric Reader', category: 'access_control', serial_number: 'ZK-K40-0091', model: 'K40', supplier_id: sup[1], purchase_date: daysAgo(450), cost: 180, warranty_expiry: daysFromNow(40), status: 'faulty', condition: 'Fingerprint sensor unresponsive', location: 'Staff Entrance', department_id: dept['Administration'] }),
    A(13, { name: 'Microsoft 365 A3 (30 seats)', category: 'software_license', serial_number: 'M365-A3-2026', model: 'A3 Education', supplier_id: sup[2], purchase_date: daysAgo(100), cost: 1050, warranty_expiry: daysFromNow(265), status: 'active', condition: null, location: 'Cloud', department_id: dept['ICT Department'], notes: 'Renews annually.' }),
    A(14, { name: 'HP LaserJet Pro M404dn', category: 'printer', serial_number: 'PHBBD11223', model: 'M404dn', supplier_id: sup[1], purchase_date: daysAgo(800), cost: 320, warranty_expiry: daysAgo(400), status: 'active', condition: 'Heavy use — drum due soon', location: 'Admin Block', department_id: dept['Administration'] }),
    A(15, { name: 'Canon ImageRunner 2630i', category: 'printer', serial_number: 'CIR2630-5518', model: 'IR-2630i', supplier_id: sup[1], purchase_date: daysAgo(150), cost: 2400, warranty_expiry: daysFromNow(215), status: 'active', condition: 'Excellent', location: 'Reprographics', department_id: dept['Administration'] }),
    A(16, { name: 'Dell Latitude 3420', category: 'laptop', serial_number: 'DL3420-11875', model: 'Latitude 3420', supplier_id: sup[0], purchase_date: daysAgo(900), cost: 700, warranty_expiry: daysAgo(500), status: 'lost', condition: null, location: 'Unknown', department_id: dept['Sports'], notes: 'Unreturned by departing coach — reported to head, Jan 2026.' }),
    A(17, { name: 'Acer Aspire TC Desktop', category: 'desktop', serial_number: 'ATC-2019-3341', model: 'Aspire TC-895', supplier_id: sup[2], purchase_date: daysAgo(1500), cost: 520, warranty_expiry: daysAgo(1100), status: 'retired', condition: 'Board failure — beyond economic repair', location: 'Storage', department_id: dept['ICT Department'] }),
    A(18, { name: 'Ubiquiti UniFi AP AC Lite', category: 'router', serial_number: 'UAP-ACL-70441', model: 'UAP-AC-Lite', supplier_id: sup[0], purchase_date: daysAgo(250), cost: 99, warranty_expiry: daysFromNow(115), status: 'active', condition: 'Good', location: 'Library Ceiling', department_id: dept['Library'] }),
    A(19, { name: 'Epson EB-W52 Projector', category: 'projector', serial_number: 'W52-10221', model: 'EB-W52', supplier_id: sup[2], purchase_date: daysAgo(90), cost: 560, warranty_expiry: daysFromNow(275), status: 'active', condition: 'Excellent', location: 'Hall', department_id: dept['Administration'] }),
    A(20, { name: 'HP ProBook 440 G8', category: 'laptop', serial_number: '5CD1290ABC', model: 'ProBook 440 G8', supplier_id: sup[0], purchase_date: daysAgo(550), cost: 780, warranty_expiry: daysFromNow(18), status: 'active', condition: 'Good', location: 'Sciences Staff Room', department_id: dept['Sciences'] }),
  ];
  const { data: insertedAssets, error: aErr } = await db.from('assets').insert(assets).select();
  if (aErr) throw aErr;
  const byTag = Object.fromEntries(insertedAssets.map((a) => [a.asset_tag, a.id]));
  console.log('assets:', insertedAssets.length);

  // 6. Assignments — open + historical
  const { error: asgErr } = await db.from('assignments').insert([
    // open custody
    { organization_id: orgId, asset_id: byTag['ICT-0001'], assigned_to: profileIds.staff, assigned_by: profileIds.ict_manager, assigned_date: daysAgo(60), expected_return_date: daysFromNow(120), notes: 'Term allocation — Sciences dept laptop.' },
    { organization_id: orgId, asset_id: byTag['ICT-0020'], assigned_to: profileIds.staff, assigned_by: profileIds.technician, assigned_date: daysAgo(30), expected_return_date: daysFromNow(60) },
    { organization_id: orgId, asset_id: byTag['ICT-0006'], assigned_to: profileIds.auditor, assigned_by: profileIds.ict_manager, assigned_date: daysAgo(10), expected_return_date: daysFromNow(5), notes: 'Audit presentation.' },
    // closed history
    { organization_id: orgId, asset_id: byTag['ICT-0001'], assigned_to: profileIds.auditor, assigned_by: profileIds.ict_manager, assigned_date: daysAgo(300), returned_date: daysAgo(120), return_condition: 'Good — minor scuffs', notes: 'Previous term.' },
    { organization_id: orgId, asset_id: byTag['ICT-0003'], assigned_to: profileIds.staff, assigned_by: profileIds.technician, assigned_date: daysAgo(200), returned_date: daysAgo(90), return_condition: 'Returned with screen flicker — logged as faulty.' },
  ]);
  if (asgErr) throw asgErr;
  console.log('assignments: 5');

  // 7. Maintenance — including a repeat-repair asset (ICT-0003)
  const { error: mErr } = await db.from('maintenance_logs').insert([
    { organization_id: orgId, asset_id: byTag['ICT-0003'], date: daysAgo(85), type: 'inspection', description: 'Screen flicker reported at return — diagnosed loose LVDS cable.', cost: 0, performed_by: 'Blessing Ndlovu', created_by: profileIds.technician },
    { organization_id: orgId, asset_id: byTag['ICT-0003'], date: daysAgo(80), type: 'repair', description: 'Reseated display cable. Flicker recurred after 2 days.', cost: 15, performed_by: 'Blessing Ndlovu', created_by: profileIds.technician },
    { organization_id: orgId, asset_id: byTag['ICT-0003'], date: daysAgo(60), type: 'repair', description: 'Replaced LVDS cable. Flicker recurred — panel fault suspected.', cost: 35, parts_replaced: 'LVDS cable', created_by: profileIds.technician, performed_by: 'Blessing Ndlovu' },
    { organization_id: orgId, asset_id: byTag['ICT-0003'], date: daysAgo(20), type: 'repair', description: 'Panel replacement quoted at $180 — awaiting approval.', cost: 0, performed_by: 'TechZim Solutions', created_by: profileIds.ict_manager },
    { organization_id: orgId, asset_id: byTag['ICT-0007'], date: daysAgo(15), type: 'part_replacement', description: 'Lamp failure — replacement lamp ordered.', cost: 85, parts_replaced: 'Projector lamp ELPLP97', performed_by: 'Blessing Ndlovu', created_by: profileIds.technician },
    { organization_id: orgId, asset_id: byTag['ICT-0014'], date: daysAgo(45), type: 'service', description: 'Full service — rollers cleaned, firmware updated. Drum at 85% wear.', cost: 25, performed_by: 'Harare Office Systems', created_by: profileIds.technician },
    { organization_id: orgId, asset_id: byTag['ICT-0009'], date: daysAgo(120), type: 'inspection', description: 'Annual network audit — config backed up, firmware updated.', cost: 0, performed_by: 'Blessing Ndlovu', created_by: profileIds.technician },
    { organization_id: orgId, asset_id: byTag['ICT-0011'], date: daysAgo(30), type: 'service', description: 'CCTV camera lenses cleaned; HDD health OK (78% capacity).', cost: 10, performed_by: 'Blessing Ndlovu', created_by: profileIds.technician },
  ]);
  if (mErr) throw mErr;
  console.log('maintenance logs: 8');

  console.log('\n✅ Seed complete.');
  console.log(`Org: ${ORG_NAME}`);
  console.log(`Demo password (all users): ${DEMO_PASSWORD}`);
  for (const u of users) console.log(`  ${u.role.padEnd(12)} ${u.email}`);
}

main().catch((e) => {
  console.error('Seed failed:', e.message ?? e);
  process.exit(1);
});
