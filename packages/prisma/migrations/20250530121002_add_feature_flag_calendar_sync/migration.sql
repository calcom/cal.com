INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'calendar-sync',
    false,
    'Enable sync from Third Party Calendar to Cal.com.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;