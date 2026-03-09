-- Add city/state name columns to onboarding for filtering
ALTER TABLE onboarding
  ADD COLUMN IF NOT EXISTS cidade_nome TEXT,
  ADD COLUMN IF NOT EXISTS estado_sigla TEXT;

CREATE INDEX IF NOT EXISTS onboarding_estado_sigla_idx ON onboarding (estado_sigla);
