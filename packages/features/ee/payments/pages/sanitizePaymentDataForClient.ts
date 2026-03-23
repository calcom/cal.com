/** Fields each payment app needs on the client.*/
const PAYMENT_APP_CLIENT_WHITELIST: Record<string, string[]> = {
  hitpay: ["id", "url", "defaultLink", "eventTypeSlug", "bookingUid", "email", "bookingUserName"],
  paypal: ["order", "capture"],
  btcpayserver: ["invoice"],
  alby: ["invoice"],
};

/**
 * Payment.data contains sensitive Stripe credentials (stripeAccount, client_secret)
 * and booker PII (email, phone, name) that must never reach the browser.
 * This function whitelists only the fields each payment app's frontend actually needs.
 */
export function sanitizePaymentDataForClient(
  data: Record<string, unknown>,
  appId?: string
): Record<string, unknown> {
  if (appId && PAYMENT_APP_CLIENT_WHITELIST[appId]) {
    const whitelist = PAYMENT_APP_CLIENT_WHITELIST[appId];
    const result: Record<string, unknown> = {};
    for (const key of whitelist) {
      if (key in data && data[key] !== undefined) {
        result[key] = data[key];
      }
    }
    return result;
  }

  return {
    ...(data.stripe_publishable_key ? { stripe_publishable_key: data.stripe_publishable_key } : {}),
    ...(data.setupIntent ? { setupIntent: {} } : {}),
  };
}
