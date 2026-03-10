-- Add excluded flag to users to permanently block certain users from import/counts
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS excluded BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS users_excluded_idx ON users (excluded) WHERE excluded = TRUE;

-- Mark the known fake/excluded companies
UPDATE users SET excluded = TRUE WHERE email IN (
  'f.nadai05@gmail.com',
  'claytonrocha@jogamais.app',
  'flaviogabriel@outlook.com',
  'rafaela.prz@movelariaoliveira.com',
  'nicolas.ibanheiz@gmail.com',
  'projetos@slideworks.cc',
  'sb_apoiador_pj@slideworks.cc'
);

-- Remove their onboarding records so dashboard counts are immediately correct
DELETE FROM onboarding WHERE user_id IN (
  SELECT user_id FROM users WHERE excluded = TRUE
);
