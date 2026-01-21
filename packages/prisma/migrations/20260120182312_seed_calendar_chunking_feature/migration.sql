INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'calendar-chunking',
    false,
    'Enable to use round-robin host chunking for improved availability performance on large teams',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
