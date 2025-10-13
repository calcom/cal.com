INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'booker-botid',
    false,
    'Enable BotID protection for booking endpoints - Protects booking API endpoints from bot traffic using BotID verification.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
