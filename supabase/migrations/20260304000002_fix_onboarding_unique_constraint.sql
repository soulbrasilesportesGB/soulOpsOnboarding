-- Fix: add UNIQUE constraint on (user_id, profile_kind) in onboarding table.
-- Without this constraint, upserts with onConflict:'user_id,profile_kind' silently
-- insert new rows instead of updating, creating duplicate records per user.

-- Step 1: Remove duplicates, keeping the row with the highest completion_score
-- (ties broken by most recent updated_at, then by id for determinism).
DELETE FROM onboarding
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, profile_kind) id
  FROM onboarding
  ORDER BY user_id, profile_kind, completion_score DESC, created_at DESC, id
);

-- Step 2: Add the unique constraint so future upserts work correctly.
ALTER TABLE onboarding
  ADD CONSTRAINT onboarding_user_id_profile_kind_key UNIQUE (user_id, profile_kind);
