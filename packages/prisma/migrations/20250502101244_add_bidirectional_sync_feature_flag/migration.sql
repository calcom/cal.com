INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'bi-directional-calendar-sync',
    false,
    'Enable Bi-directional Calendar Sync - Sync events between Google Calendar and Cal.com.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
