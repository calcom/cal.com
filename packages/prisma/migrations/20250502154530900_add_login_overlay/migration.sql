INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'cal-video-log-in-overlay',
    false,
    'Enable Log In Overlay - Allows system to show a log in overlay on the Cal Video page.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;