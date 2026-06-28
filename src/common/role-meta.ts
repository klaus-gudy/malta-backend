import type { RoleId } from './enums';

export interface RoleMeta {
  label: string;
  name: string;
  branch: string;
}

// Mirrors the frontend's lib/rbac.ts so application.officer is stamped with the
// same display name the UI expects.
export const roleMeta: Record<RoleId, RoleMeta> = {
  admin: { label: 'Administrator', name: 'Joseph Kimaro', branch: 'HQ' },
  officer: { label: 'Loan Officer', name: 'Amina Hassan', branch: 'Kariakoo' },
  manager: { label: 'Branch Manager', name: 'Grace Lyimo', branch: 'Kariakoo' },
  operations: { label: 'Operations Officer', name: 'Said Juma', branch: 'HQ' },
  cashier: { label: 'Cashier', name: 'Halima Ngowi', branch: 'Kariakoo' },
};

export type Permission =
  | 'approve'
  | 'configProducts'
  | 'manageUsers'
  | 'disburse'
  | 'receivePayment'
  | 'createApplication'
  | 'createCustomer';

export const PERMISSIONS: Record<Permission, RoleId[]> = {
  approve: ['admin', 'manager'],
  configProducts: ['admin', 'manager'],
  manageUsers: ['admin'],
  disburse: ['admin', 'operations', 'manager'],
  receivePayment: ['admin', 'cashier', 'manager'],
  createApplication: ['admin', 'officer', 'manager'],
  createCustomer: ['admin', 'officer', 'manager', 'operations'],
};

export function can(role: RoleId, action: Permission): boolean {
  return (PERMISSIONS[action] || []).includes(role);
}
