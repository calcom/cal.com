INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'organizer-request-email-v2',
    false,
    'Enable confirmation email with built-in rejection form',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
