INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'calendar-cache-serve',
    false,
    'Wether to serve calendar cache by default or not per team/user basis.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
