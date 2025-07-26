INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'calendar-cache-sql-read',
    false,
    'Whether to read calendar cache from SQL database on a team/user basis.',
    'OPERATIONAL'
  ),
  (
    'calendar-cache-sql-write',
    false,
    'Whether to write calendar cache to SQL database on a team/user basis.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
