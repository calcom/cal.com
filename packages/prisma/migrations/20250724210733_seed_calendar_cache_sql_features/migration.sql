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
  ),
  (
    'calendar-cache-sql-cleanup',
    false,
    'Whether to enable the cron job for cleaning old CalendarEvent table entries.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
