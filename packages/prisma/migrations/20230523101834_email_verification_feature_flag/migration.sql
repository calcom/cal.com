INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'email-verification',
    false,
    'Enable email verification for new users',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
