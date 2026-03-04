/*
  # Restrict write access on core tables to admin only

  ## Changes
  - `users`, `onboarding`, `outreach`: INSERT, UPDATE, DELETE now require admin role
  - SELECT remains open to all authenticated users (team read access)
  - Drops both old ("Allow authenticated users to...") and renamed ("Users: Insert" etc.)
    policy variants, since the live DB has duplicates from a partial migration run.
*/

-- ─── users ────────────────────────────────────────────────────────────────────
-- Drop all write policies (both naming conventions present in live DB)
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to delete users" ON users;
DROP POLICY IF EXISTS "Users: Insert"                            ON users;
DROP POLICY IF EXISTS "Users: Update"                           ON users;
DROP POLICY IF EXISTS "Users: Delete"                           ON users;

CREATE POLICY "Admin insert: users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin update: users"
  ON users FOR UPDATE
  TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin delete: users"
  ON users FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── onboarding ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to insert onboarding" ON onboarding;
DROP POLICY IF EXISTS "Allow authenticated users to update onboarding" ON onboarding;
DROP POLICY IF EXISTS "Allow authenticated users to delete onboarding" ON onboarding;
DROP POLICY IF EXISTS "Onboarding: Insert"                            ON onboarding;
DROP POLICY IF EXISTS "Onboarding: Update"                            ON onboarding;
DROP POLICY IF EXISTS "Onboarding: Delete"                            ON onboarding;

CREATE POLICY "Admin insert: onboarding"
  ON onboarding FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin update: onboarding"
  ON onboarding FOR UPDATE
  TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin delete: onboarding"
  ON onboarding FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── outreach ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to insert outreach" ON outreach;
DROP POLICY IF EXISTS "Allow authenticated users to update outreach" ON outreach;
DROP POLICY IF EXISTS "Allow authenticated users to delete outreach" ON outreach;
DROP POLICY IF EXISTS "Outreach: Insert"                            ON outreach;
DROP POLICY IF EXISTS "Outreach: Update"                            ON outreach;
DROP POLICY IF EXISTS "Outreach: Delete"                            ON outreach;

CREATE POLICY "Admin insert: outreach"
  ON outreach FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin update: outreach"
  ON outreach FOR UPDATE
  TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin delete: outreach"
  ON outreach FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
