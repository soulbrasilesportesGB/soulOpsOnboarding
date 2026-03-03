import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'team';

export function useRole(): UserRole {
  const { session } = useAuth();
  return session?.user?.user_metadata?.role === 'admin' ? 'admin' : 'team';
}
