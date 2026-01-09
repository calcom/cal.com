INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'tiered-support-chat',
    false,
    'Enable Tiered Support Chat - Allow users to access different levels of support chat based on their subscription tier.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
