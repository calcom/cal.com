INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'attributes',
    false,
    'Enable attributes for organizations',
    'EXPERIMENT'
  ) ON CONFLICT (slug) DO NOTHING;
