/*
  # Fix Security Advisories

  ## Changes

  ### 1. RLS user_metadata → app_metadata (ERROR)
  - `user_metadata` is editable by end users via `supabase.auth.updateUser()`.
    Any user could set `role = 'admin'` and bypass the admin-only policies.
  - Fix: use `app_metadata` which is only writable via the service role.
  - Affects: ops_metrics, ops_investors

  ### 2. set_updated_at — fixed search_path (WARN)
  - Adding `SET search_path = public` prevents search path injection.

  ### 3. onboarding_snapshots — restrict write to admin (WARN)
  - INSERT/UPDATE were open to all authenticated users.
  - Only admins run the CSV import, so admin-only write is correct.

  ### 4. athlete_commercial_scores — restrict write to admin (WARN)
  - Duplicate and overly-permissive INSERT/UPDATE policies replaced with admin-only.

  ## ⚠️ Action Required After Applying
  Admin users must have `role = 'admin'` set in `app_metadata` (NOT user_metadata).
  Run via Supabase Admin API (service role):
    supabase.auth.admin.updateUserById(userId, { app_metadata: { role: 'admin' } })
*/

-- ─── 1. Fix ops_metrics: user_metadata → app_metadata ────────────────────────
DROP POLICY IF EXISTS "Admin only: ops_metrics" ON ops_metrics;

CREATE POLICY "Admin only: ops_metrics"
  ON ops_metrics FOR ALL
  TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── 2. Fix ops_investors: user_metadata → app_metadata ──────────────────────
DROP POLICY IF EXISTS "Admin only: ops_investors" ON ops_investors;

CREATE POLICY "Admin only: ops_investors"
  ON ops_investors FOR ALL
  TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── 3. Fix set_updated_at: add fixed search_path ────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── 4. Fix onboarding_snapshots: admin-only write ───────────────────────────
DROP POLICY IF EXISTS "Authenticated insert: onboarding_snapshots" ON onboarding_snapshots;
DROP POLICY IF EXISTS "Authenticated update: onboarding_snapshots" ON onboarding_snapshots;

CREATE POLICY "Admin insert: onboarding_snapshots"
  ON onboarding_snapshots FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin update: onboarding_snapshots"
  ON onboarding_snapshots FOR UPDATE
  TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── 5. Fix athlete_commercial_scores: admin-only write ──────────────────────
-- Drop all overly-permissive and duplicate write policies
DROP POLICY IF EXISTS "acs_insert_authenticated"  ON athlete_commercial_scores;
DROP POLICY IF EXISTS "acs_update_authenticated"  ON athlete_commercial_scores;
DROP POLICY IF EXISTS "scores_update_auth"        ON athlete_commercial_scores;
DROP POLICY IF EXISTS "scores_write_auth"         ON athlete_commercial_scores;

CREATE POLICY "Admin insert: athlete_commercial_scores"
  ON athlete_commercial_scores FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin update: athlete_commercial_scores"
  ON athlete_commercial_scores FOR UPDATE
  TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
