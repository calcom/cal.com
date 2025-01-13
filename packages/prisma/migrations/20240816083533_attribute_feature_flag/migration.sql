INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'attributes',
    false,
    'Enable attributes - Custom fields for users and teams.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
