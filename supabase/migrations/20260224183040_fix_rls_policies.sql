/*
  # Fix RLS Policies for Onboarding App

  The original RLS policies were too restrictive for internal operations.
  Update policies to allow authenticated users to perform all operations.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read onboarding" ON onboarding;
DROP POLICY IF EXISTS "Allow authenticated users to insert onboarding" ON onboarding;
DROP POLICY IF EXISTS "Allow authenticated users to update onboarding" ON onboarding;
DROP POLICY IF EXISTS "Allow authenticated users to delete onboarding" ON onboarding;
DROP POLICY IF EXISTS "Allow authenticated users to read outreach" ON outreach;
DROP POLICY IF EXISTS "Allow authenticated users to insert outreach" ON outreach;
DROP POLICY IF EXISTS "Allow authenticated users to update outreach" ON outreach;
DROP POLICY IF EXISTS "Allow authenticated users to delete outreach" ON outreach;

-- Create new permissive policies for users table
CREATE POLICY "Users: Read all"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users: Insert"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users: Update"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users: Delete"
  ON users FOR DELETE
  TO authenticated
  USING (true);

-- Create new permissive policies for onboarding table
CREATE POLICY "Onboarding: Read all"
  ON onboarding FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Onboarding: Insert"
  ON onboarding FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Onboarding: Update"
  ON onboarding FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Onboarding: Delete"
  ON onboarding FOR DELETE
  TO authenticated
  USING (true);

-- Create new permissive policies for outreach table
CREATE POLICY "Outreach: Read all"
  ON outreach FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Outreach: Insert"
  ON outreach FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Outreach: Update"
  ON outreach FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Outreach: Delete"
  ON outreach FOR DELETE
  TO authenticated
  USING (true);