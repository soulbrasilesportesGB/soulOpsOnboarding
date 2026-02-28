import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Onboarding } from '../types/database';

interface UseOnboardingOptions {
  profileKind?: string;
  completionStatus?: string;
}

export function useOnboarding(options?: UseOnboardingOptions) {
  const [data, setData] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('onboarding').select('*');

      if (options?.profileKind) {
        query = query.eq('profile_kind', options.profileKind);
      }

      if (options?.completionStatus) {
        query = query.eq('completion_status', options.completionStatus);
      }

      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;
      setData(result || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch onboarding data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboarding();
  }, [options?.profileKind, options?.completionStatus]);

  const refetch = () => fetchOnboarding();

  return { data, loading, error, refetch };
}
