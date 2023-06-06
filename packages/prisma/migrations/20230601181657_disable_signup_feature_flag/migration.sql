INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'disable-signup',
    false,
    'Enable to prevent users from signing up',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
 