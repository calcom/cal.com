INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'booker-layouts',
    true,
    'Enable new booker configuration settings for all users',
    'EXPERIMENT'
  ) ON CONFLICT (slug) DO NOTHING;
