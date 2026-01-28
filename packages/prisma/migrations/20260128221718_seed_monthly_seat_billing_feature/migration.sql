INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'monthly-seat-billing',
    false,
    'Enables next-cycle billing for monthly seat-based plans. When enabled, seat changes update subscription quantity without immediate proration - Stripe charges the full amount at the next billing cycle.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
