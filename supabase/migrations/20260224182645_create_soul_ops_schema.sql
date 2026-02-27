/*
  # Soul Ops - Onboarding Schema

  ## New Tables
  
  ### `users`
  - `user_id` (uuid, primary key) - Unique identifier for each user
  - `email` (text, not null) - User email address
  - `full_name` (text) - User's full name
  - `created_at_portal` (timestamptz) - When user was created in portal
  - `updated_at_portal` (timestamptz) - When user was last updated in portal
  
  ### `onboarding`
  - `id` (uuid, primary key) - Unique identifier for onboarding record
  - `user_id` (uuid, foreign key) - References users table
  - `profile_kind` (text) - Type of profile: 'athlete' or 'partner'
  - `entity_type` (text, nullable) - Entity type: 'pj' or 'pf'
  - `completion_score` (int) - Onboarding completion score (0-100)
  - `completion_status` (text) - Status: 'stalled', 'incomplete', 'almost', 'complete'
  - `missing_fields` (jsonb) - JSON object with missing field information
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp
  
  ### `outreach`
  - `id` (uuid, primary key) - Unique identifier for outreach record
  - `user_id` (uuid, foreign key) - References users table
  - `channel` (text) - Communication channel used
  - `outcome` (text) - Result of the outreach
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - When outreach was performed
  - `next_followup_at` (timestamptz, nullable) - When to follow up next

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  created_at_portal timestamptz DEFAULT now(),
  updated_at_portal timestamptz DEFAULT now()
);

-- Create onboarding table
CREATE TABLE IF NOT EXISTS onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  profile_kind text NOT NULL,
  entity_type text,
  completion_score int DEFAULT 0,
  completion_status text DEFAULT 'stalled',
  missing_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create outreach table
CREATE TABLE IF NOT EXISTS outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  channel text NOT NULL,
  outcome text,
  notes text,
  created_at timestamptz DEFAULT now(),
  next_followup_at timestamptz
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_profile_kind ON onboarding(profile_kind);
CREATE INDEX IF NOT EXISTS idx_onboarding_completion_status ON onboarding(completion_status);
CREATE INDEX IF NOT EXISTS idx_outreach_user_id ON outreach(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_next_followup ON outreach(next_followup_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Allow authenticated users to read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update users"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for onboarding table
CREATE POLICY "Allow authenticated users to read onboarding"
  ON onboarding FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert onboarding"
  ON onboarding FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update onboarding"
  ON onboarding FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete onboarding"
  ON onboarding FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for outreach table
CREATE POLICY "Allow authenticated users to read outreach"
  ON outreach FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert outreach"
  ON outreach FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update outreach"
  ON outreach FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete outreach"
  ON outreach FOR DELETE
  TO authenticated
  USING (true);