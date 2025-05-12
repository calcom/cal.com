INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'use-api-v2-for-team-slots',
    false,
    'Whether to use API v2 for fetching team schedule slots.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
