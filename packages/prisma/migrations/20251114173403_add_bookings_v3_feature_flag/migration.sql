INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'bookings-v3',
    false,
    'Enable bookings redesign v3 for all users',
    'EXPERIMENT'
  ) ON CONFLICT (slug) DO NOTHING;
