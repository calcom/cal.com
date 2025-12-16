INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'onboarding-v3',
    true,
    'Enable onboarding v3 for all users',
    'EXPERIMENT'
  ) ON CONFLICT (slug) DO UPDATE
SET
  enabled = true,
  "updatedAt" = NOW();


