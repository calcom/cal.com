INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'booking-audit',
    false,
    'Enable booking audit trails - Track all booking actions and changes for organizations',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;

