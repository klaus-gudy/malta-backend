// Domain enums shared across modules. Values mirror the frontend's
// lib/types.ts so the API responses are drop-in compatible.

export type RoleId = 'admin' | 'officer' | 'manager' | 'operations' | 'cashier';
export const ROLE_IDS: RoleId[] = [
  'admin',
  'officer',
  'manager',
  'operations',
  'cashier',
];

export type CustomerStatus = 'Active' | 'Inactive';
export type KycStatus = 'Verified' | 'Pending' | 'Rejected';

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Disbursed';

export type LoanStatus = 'Active' | 'Overdue' | 'Closed' | 'Written Off';

export type ActiveInactive = 'Active' | 'Inactive';
