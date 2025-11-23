INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'onboarding-v3',
    false,
    'Enable onboarding v3 for all users',
    'EXPERIMENT'
  ) ON CONFLICT (slug) DO NOTHING;
