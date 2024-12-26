INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'calendar-cache-serve',
    false,
    'Whether to serve calendar cache by default or not on a team/user basis.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
