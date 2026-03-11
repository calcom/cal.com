/**
 * Payment.data contains sensitive Stripe credentials (stripeAccount, client_secret)
 * and booker PII (email, phone, name) that must never reach the browser.
 * This function whitelists only the two fields the frontend actually reads.
 */
export function sanitizePaymentDataForClient(data: Record<string, unknown>): Record<string, unknown> {
  return {
    ...(data.stripe_publishable_key ? { stripe_publishable_key: data.stripe_publishable_key } : {}),
    ...(data.setupIntent ? { setupIntent: {} } : {}),
  };
}
