/*
  # Daily Progression & Team Visibility

  ## New Tables
  ### `onboarding_snapshots`
  - One row per (user_id, profile_kind, snapshot_date)
  - Written by CSV import on each run
  - Used by Dashboard to show daily progression (new, improved, unchanged)

  ## Policy Changes
  ### `ops_metrics` — add team SELECT policy
  - All authenticated users can now READ ops_metrics
  - Non-financial fields (funil, social) are shown to team in Dashboard
  - Admin-only write policies remain unchanged
*/

-- ─── onboarding_snapshots ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_snapshots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  snapshot_date     date NOT NULL,
  profile_kind      text NOT NULL,
  completion_status text NOT NULL,
  completion_score  int  NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, profile_kind, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date     ON onboarding_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id  ON onboarding_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date_kind ON onboarding_snapshots(snapshot_date, profile_kind);

ALTER TABLE onboarding_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read: onboarding_snapshots"
  ON onboarding_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert: onboarding_snapshots"
  ON onboarding_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update: onboarding_snapshots"
  ON onboarding_snapshots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Allow team members to read ops_metrics ───────────────────────────────────
-- This enables the Dashboard to show funil/social metrics to all team users.
-- Write operations remain admin-only via the existing policy.
CREATE POLICY "Team read: ops_metrics"
  ON ops_metrics FOR SELECT
  TO authenticated
  USING (true);
