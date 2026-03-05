/*
  # Create athlete_commercial_scores table

  Stores the commercial scoring for each athlete, calculated during CSV import.
  Scores are based on 5 pillars (P1–P5), each 0–25, summing to a max of 100.

  ## Tiers (from total_score)
  - Atleta Âncora:                total_score >= 90
  - Atleta Comercial Forte:       total_score >= 75
  - Atleta Comercial Potencial:   total_score >= 60
  - Ainda não comercializável:    total_score < 60

  ## Pillars
  - P1 performance: ranking / results / achievements presence
  - P2 narrative:   bio / narrative fields + causes
  - P3 maturity:    onboarding completion status + education + partners
  - P4 activation:  talk/mentor activations
  - P5 fit:         market alignment fields
*/

CREATE TABLE IF NOT EXISTS athlete_commercial_scores (
  athlete_id   text        PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  p1_performance numeric(5,2) NOT NULL DEFAULT 0,
  p2_narrative   numeric(5,2) NOT NULL DEFAULT 0,
  p3_maturity    numeric(5,2) NOT NULL DEFAULT 0,
  p4_activation  numeric(5,2) NOT NULL DEFAULT 0,
  p5_fit         numeric(5,2) NOT NULL DEFAULT 0,
  total_score    numeric(5,2) NOT NULL DEFAULT 0,
  tier           text,
  notes          text,
  updated_by     text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Index for joining with users
CREATE INDEX IF NOT EXISTS athlete_commercial_scores_user_id_idx
  ON athlete_commercial_scores (user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER athlete_commercial_scores_updated_at
  BEFORE UPDATE ON athlete_commercial_scores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE athlete_commercial_scores ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Team read: athlete_commercial_scores"
  ON athlete_commercial_scores FOR SELECT
  TO authenticated
  USING (true);

-- Only admin can write
CREATE POLICY "Admin insert: athlete_commercial_scores"
  ON athlete_commercial_scores FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin update: athlete_commercial_scores"
  ON athlete_commercial_scores FOR UPDATE
  TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin delete: athlete_commercial_scores"
  ON athlete_commercial_scores FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
