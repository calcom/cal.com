INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'pbac',
    false,
    'Enables the PBAC feature.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
