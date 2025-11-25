INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'booking-calendar-view',
    false,
    'Enable booking calendar view for all users',
    'EXPERIMENT'
  ) ON CONFLICT (slug) DO NOTHING;
