INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'booking-email-validation',
    false,
    'Enable email validation during booking process using ZeroBounce API - Prevents bookings with invalid, spam, or abusive email addresses.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
