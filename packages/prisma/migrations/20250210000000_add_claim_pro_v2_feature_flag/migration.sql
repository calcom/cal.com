INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES (
  'claim-pro-v2',
  false,
  'Claim Pro flow: ON = 1st year Tally + 2nd year bookings. OFF = 1st year bookings + 2nd year Tally.',
  'OPERATIONAL'
) ON CONFLICT (slug) DO NOTHING;
