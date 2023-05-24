INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'email-verification',
    true,
    'Enable email verification for new users',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
