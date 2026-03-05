import { useAuth } from './useAuth';

export type UserRole =
  | 'super_admin'
  | 'editor'
  | 'mkt_editor'
  | 'commercial_editor'
  | 'viewer';

const VALID_ROLES: UserRole[] = ['super_admin', 'editor', 'mkt_editor', 'commercial_editor', 'viewer'];

export function useRole(): UserRole {
  const { session } = useAuth();
  const raw = session?.user?.app_metadata?.role;
  // 'admin' (DB legacy value) maps to super_admin
  if (raw === 'admin' || raw === 'super_admin') return 'super_admin';
  if (VALID_ROLES.includes(raw as UserRole)) return raw as UserRole;
  return 'viewer';
}

// Permission helpers
export const isSuperAdmin    = (role: UserRole) => role === 'super_admin';
export const canImport       = (role: UserRole) => role === 'super_admin';
export const canEditOutreach = (role: UserRole) => role === 'super_admin' || role === 'editor';
export const canEditMarketing   = (role: UserRole) =>
  role === 'super_admin' || role === 'editor' || role === 'mkt_editor';
export const canEditCommercial  = (role: UserRole) =>
  role === 'super_admin' || role === 'editor' || role === 'commercial_editor';
