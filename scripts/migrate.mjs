// Apply ordered SQL migrations to the Supabase Postgres. Usage: node scripts/migrate.mjs
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const ref = new URL(process.env.VITE_SUPABASE_URL).hostname.split('.')[0];
const password = process.env.DB_PASSWORD;

// Try direct connection, then session poolers across common regions.
const candidates = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
  ...[
    'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-north-1', 'af-south-1',
    'us-east-1', 'us-east-2', 'us-west-1', 'ap-southeast-1',
  ].map((r) => ({ host: `aws-0-${r}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` })),
];

async function connect() {
  for (const c of candidates) {
    const client = new pg.Client({
      ...c,
      database: 'postgres',
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      console.log('Connected via', c.host);
      return client;
    } catch (e) {
      console.log('  ×', c.host, '-', e.code ?? e.message);
    }
  }
  throw new Error('Could not connect to the database with any known host.');
}

const client = await connect();
await client.query(`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`);
const { rows } = await client.query('select name from _migrations');
const done = new Set(rows.map((r) => r.name));

const dir = 'supabase/migrations';
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(file)) {
    console.log('skip', file);
    continue;
  }
  const sql = readFileSync(join(dir, file), 'utf8');
  console.log('apply', file);
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query(`insert into _migrations (name) values ($1)`, [file]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    console.error('FAILED', file, '-', e.message);
    process.exit(1);
  }
}
console.log('✅ migrations complete');
await client.end();
