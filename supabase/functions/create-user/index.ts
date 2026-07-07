// IATS Edge Function: create-user
// Allows an active super_admin to create a user (auth + profile) in their own org.
// Deploy: npx supabase functions deploy create-user --project-ref <ref>
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  // authenticate the caller from their JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const { data: caller, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !caller?.user) return json({ error: 'Not signed in.' }, 401);

  // caller must be an active super_admin
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('organization_id, role, active')
    .eq('id', caller.user.id)
    .single();
  if (!callerProfile || callerProfile.role !== 'super_admin' || !callerProfile.active) {
    return json({ error: 'Only an active super admin can create users.' }, 403);
  }

  let body: {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
    department_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const { email, password, full_name, role, department_id } = body;
  const validRoles = ['super_admin', 'ict_manager', 'technician', 'auditor', 'staff'];
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'A valid email is required.' }, 400);
  if (!password || password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
  if (!full_name || full_name.trim().length < 2) return json({ error: 'Full name is required.' }, 400);
  if (!role || !validRoles.includes(role)) return json({ error: 'Invalid role.' }, 400);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) {
    const msg = /already/i.test(createErr.message)
      ? 'A user with that email already exists.'
      : 'Could not create the user.';
    return json({ error: msg }, 400);
  }

  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    organization_id: callerProfile.organization_id,
    full_name: full_name.trim(),
    role,
    department_id: department_id || null,
    active: true,
  });
  if (profileErr) {
    // roll back the orphan auth user
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: 'Could not create the profile.' }, 500);
  }

  return json({ id: created.user.id, email });
});
