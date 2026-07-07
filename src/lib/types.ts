// Domain types. Replaced/augmented by generated Supabase types (npm run gen:types)
// once the project is linked; these hand-written types match the migrations exactly.

export type AppRole = 'super_admin' | 'ict_manager' | 'technician' | 'auditor' | 'staff';

export type AssetCategory =
  | 'laptop'
  | 'desktop'
  | 'printer'
  | 'projector'
  | 'interactive_screen'
  | 'router'
  | 'switch'
  | 'cctv'
  | 'access_control'
  | 'software_license'
  | 'other';

export type AssetStatus = 'active' | 'faulty' | 'in_repair' | 'retired' | 'lost';
export type MaintenanceType = 'repair' | 'service' | 'inspection' | 'part_replacement';
export type AttachmentKind = 'invoice' | 'warranty' | 'photo' | 'other';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  role: AppRole;
  department_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  organization_id: string;
  asset_tag: string;
  name: string;
  category: AssetCategory;
  serial_number: string | null;
  model: string | null;
  supplier_id: string | null;
  purchase_date: string | null;
  cost: number | null;
  warranty_expiry: string | null;
  status: AssetStatus;
  condition: string | null;
  location: string | null;
  department_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  organization_id: string;
  asset_id: string;
  assigned_to: string;
  assigned_by: string;
  assigned_date: string;
  expected_return_date: string | null;
  returned_date: string | null;
  return_condition: string | null;
  notes: string | null;
  created_at: string;
}

export interface MaintenanceLog {
  id: string;
  organization_id: string;
  asset_id: string;
  date: string;
  type: MaintenanceType;
  description: string;
  parts_replaced: string | null;
  cost: number | null;
  performed_by: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  organization_id: string;
  asset_id: string;
  storage_path: string;
  file_name: string;
  kind: AttachmentKind;
  uploaded_by: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  table_name: string;
  record_id: string;
  action: string;
  changed_by: string | null;
  changed_at: string;
  diff: Record<string, unknown> | null;
}

export const ASSET_CATEGORIES: AssetCategory[] = [
  'laptop', 'desktop', 'printer', 'projector', 'interactive_screen',
  'router', 'switch', 'cctv', 'access_control', 'software_license', 'other',
];

export const ASSET_STATUSES: AssetStatus[] = ['active', 'faulty', 'in_repair', 'retired', 'lost'];

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  laptop: 'Laptop',
  desktop: 'Desktop',
  printer: 'Printer',
  projector: 'Projector',
  interactive_screen: 'Interactive Screen',
  router: 'Router',
  switch: 'Switch',
  cctv: 'CCTV',
  access_control: 'Access Control',
  software_license: 'Software License',
  other: 'Other',
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'Active',
  faulty: 'Faulty',
  in_repair: 'In Repair',
  retired: 'Retired',
  lost: 'Lost',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  ict_manager: 'ICT Manager',
  technician: 'Technician',
  auditor: 'Auditor',
  staff: 'Staff',
};
