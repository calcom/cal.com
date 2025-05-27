INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'pbac',
    false,
    'Enable PBAC - Enables the PBAC feature globally.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
