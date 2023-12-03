INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'time-capsule',
    false,
    'Enable time capsule for all users',
    'EXPERIMENT'
  ) ON CONFLICT (slug) DO NOTHING;
