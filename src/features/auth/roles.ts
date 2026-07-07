import type { AppRole } from '@/lib/types';

/** Role capability matrix — mirrors the RLS policies (UI convenience only; DB is authoritative). */
export const can = {
  manageOrg: (r: AppRole) => r === 'super_admin',
  assetWrite: (r: AppRole) => ['super_admin', 'ict_manager', 'technician'].includes(r),
  assetDelete: (r: AppRole) => r === 'super_admin',
  assign: (r: AppRole) => ['super_admin', 'ict_manager', 'technician'].includes(r),
  logMaintenance: (r: AppRole) => ['super_admin', 'ict_manager', 'technician'].includes(r),
  viewAll: (r: AppRole) => ['super_admin', 'ict_manager', 'technician', 'auditor'].includes(r),
  reports: (r: AppRole) => ['super_admin', 'ict_manager', 'technician', 'auditor'].includes(r),
};
