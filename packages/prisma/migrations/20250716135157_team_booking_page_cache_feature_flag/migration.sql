INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'team-booking-page-cache',
    false,
    'Enable to cache event-type and team data for team booking pages',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
 