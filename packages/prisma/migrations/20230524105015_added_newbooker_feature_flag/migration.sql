INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'booker-layouts',
    false,
    'Enable new booker configuration settings for all users',
    'EXPERIMENT'
  ) ON CONFLICT (slug) DO NOTHING;
