INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'managed-event-types',
    true,
    'Enable creating & distributing event types in bulk to team members for this instance',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
