import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Onboarding, Outreach } from '../types/database';

export interface UserWithRelations {
  user: User | null;
  onboarding: Onboarding[];
  outreach: Outreach[];
}

export function useUserData(userId: string) {
  const [data, setData] = useState<UserWithRelations>({
    user: null,
    onboarding: [],
    outreach: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, onboardingRes, outreachRes] = await Promise.all([
        supabase.from('users').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('onboarding').select('*').eq('user_id', userId),
        supabase.from('outreach').select('*').eq('user_id', userId).order('created_at', {
          ascending: false,
        }),
      ]);

      if (userRes.error) throw userRes.error;
      if (onboardingRes.error) throw onboardingRes.error;
      if (outreachRes.error) throw outreachRes.error;

      setData({
        user: userRes.data as User | null,
        onboarding: onboardingRes.data || [],
        outreach: outreachRes.data || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const refetch = () => fetchUserData();

  return { ...data, loading, error, refetch };
}
