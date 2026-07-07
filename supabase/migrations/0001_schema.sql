-- IATS 0001: core schema. All tables tenant-aware (organization_id) from day one.

create extension if not exists "pgcrypto";

-- enums
create type app_role as enum ('super_admin', 'ict_manager', 'technician', 'auditor', 'staff');
create type asset_category as enum (
  'laptop','desktop','printer','projector','interactive_screen','router','switch',
  'cctv','access_control','software_license','other'
);
create type asset_status as enum ('active','faulty','in_repair','retired','lost');
create type maintenance_type as enum ('repair','service','inspection','part_replacement');
create type attachment_kind as enum ('invoice','warranty','photo','other');

-- organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- departments
create table departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  full_name text not null,
  role app_role not null default 'staff',
  department_id uuid references departments(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- suppliers
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  contact text,
  created_at timestamptz not null default now()
);

-- assets
create table assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  asset_tag text not null,
  name text not null,
  category asset_category not null,
  serial_number text,
  model text,
  supplier_id uuid references suppliers(id),
  purchase_date date,
  cost numeric(12,2),
  warranty_expiry date,
  status asset_status not null default 'active',
  condition text,
  location text,
  department_id uuid references departments(id),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_tag)
);
create index assets_org_status_idx on assets(organization_id, status);
create index assets_org_category_idx on assets(organization_id, category);
create index assets_search_idx on assets using gin (
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(serial_number,'') || ' ' || coalesce(asset_tag,''))
);

-- assignments (append-only)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  asset_id uuid not null references assets(id),
  assigned_to uuid not null references profiles(id),
  assigned_by uuid not null references profiles(id),
  assigned_date date not null default current_date,
  expected_return_date date,
  returned_date date,
  return_condition text,
  notes text,
  created_at timestamptz not null default now()
);
-- at most one open assignment per asset
create unique index one_open_assignment_per_asset
  on assignments(asset_id) where returned_date is null;
create index assignments_org_asset_idx on assignments(organization_id, asset_id);
create index assignments_assigned_to_idx on assignments(assigned_to);

-- maintenance_logs (append-only)
create table maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  asset_id uuid not null references assets(id),
  date date not null default current_date,
  type maintenance_type not null,
  description text not null,
  parts_replaced text,
  cost numeric(12,2),
  performed_by text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index maintenance_org_asset_idx on maintenance_logs(organization_id, asset_id);

-- attachments
create table attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  asset_id uuid not null references assets(id),
  storage_path text not null,
  file_name text not null,
  kind attachment_kind not null default 'other',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index attachments_org_asset_idx on attachments(organization_id, asset_id);

-- audit_log (append-only, trigger-populated)
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  diff jsonb
);
create index audit_org_time_idx on audit_log(organization_id, changed_at desc);
