import { GoogleAdsApi } from "google-ads-api";

import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";

import type { LazyModule, SWHMap } from "./__handler";

type Data = SWHMap["invoice.paid"]["data"];

type Handlers = Record<`prod_${string}`, () => LazyModule<Data>>;

// We can't crash here if STRIPE_ORG_PRODUCT_ID is not set, because not all self-hosters use Organizations and it might break the build on import of this module.
const STRIPE_ORG_PRODUCT_ID = process.env.STRIPE_ORG_PRODUCT_ID || "";

const log = logger.getSubLogger({ prefix: ["stripe-webhook-invoice-paid"] });

/**
 * Send conversion to Google Ads for recurring subscription payments
 * Tracks conversions for every payment (not just first payment)
 */
async function sendGoogleAdsConversionForInvoice(invoice: SWHMap["invoice.paid"]["data"]["object"]) {
  // Skip if no subscription (shouldn't happen for subscription invoices)
  if (!invoice.subscription) {
    return;
  }

  // Get subscription to check for gclid in metadata
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const gclid = subscription.metadata?.gclid;

    if (!gclid) {
      log.debug("No gclid in subscription metadata, skipping Google Ads conversion tracking", {
        subscriptionId,
      });
      return;
    }

    // Check Google Ads configuration
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID;
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (
      !customerId ||
      !conversionActionId ||
      !clientId ||
      !clientSecret ||
      !developerToken ||
      !refreshToken
    ) {
      log.warn("Google Ads conversion tracking not fully configured, skipping");
      return;
    }

    // Calculate conversion value from invoice (Stripe uses cents)
    const conversionValue = invoice.amount_paid ? invoice.amount_paid / 100 : 0;
    const currency = invoice.currency?.toUpperCase() || "USD";

    // Format datetime as required by Google Ads API: "yyyy-mm-dd HH:mm:ss+|-HH:mm"
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // Get timezone offset in format +HH:mm or -HH:mm
    const timezoneOffset = -now.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, "0");
    const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, "0");
    const offsetSign = timezoneOffset >= 0 ? "+" : "-";

    const conversionDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;

    log.info("Sending Google Ads conversion for recurring payment", {
      gclid,
      value: conversionValue,
      currency,
      orderId: invoice.id,
      subscriptionId,
    });

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: developerToken,
    });

    // Get customer instance
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken,
    });

    // Upload click conversion
    const conversionAction = `customers/${customerId}/conversionActions/${conversionActionId}`;

    await customer.conversionUploads.uploadClickConversions([
      {
        gclid,
        conversion_action: conversionAction,
        conversion_date_time: conversionDateTime,
        conversion_value: conversionValue,
        currency_code: currency,
        order_id: invoice.id, // Use invoice ID for unique tracking per payment
      },
    ]);

    log.info("Google Ads conversion uploaded successfully for recurring payment", {
      gclid,
      value: conversionValue,
      invoiceId: invoice.id,
      subscriptionId,
    });
  } catch (error) {
    log.error("Error sending Google Ads conversion for recurring payment", {
      error,
      invoiceId: invoice.id,
      subscriptionId,
    });
  }
}

const stripeWebhookProductHandler = (handlers: Handlers) => async (data: Data) => {
  const invoice = data.object;

  // Send Google Ads conversion for recurring payment (async, don't block webhook)
  // This runs for ALL subscription products before product-specific logic
  sendGoogleAdsConversionForInvoice(invoice).catch((error) => {
    log.error("Google Ads conversion tracking failed for invoice", error);
  });

  // Only handle subscription invoices
  if (!invoice.subscription) {
    log.warn("Not a subscription invoice, skipping");
    return { success: false, message: "Not a subscription invoice, skipping" };
  }

  // Get the product ID from the first subscription item
  const firstItem = invoice.lines.data[0];
  const productId = firstItem?.price?.product as string; // prod_xxxxx

  if (!productId) {
    log.warn("No product ID found in invoice, skipping");
    return { success: false, message: "No product ID found in invoice, skipping" };
  }

  const handlerGetter = handlers[productId as keyof typeof handlers];

  /**
   * If no handler is found, we skip the product. A handler could be null if we don't need webhooks to handle the business logic for the product.
   */
  if (!handlerGetter) {
    log.warn(`Skipping product: ${productId} because no handler found`);
    return { success: false, message: `Skipping product: ${productId} because no handler found` };
  }
  const handler = (await handlerGetter())?.default;
  // auto catch unsupported Stripe products.
  if (!handler) {
    log.warn(`Skipping product: ${productId} because no handler found`);
    return { success: false, message: `Skipping product: ${productId} because no handler found` };
  }
  return await handler(data);
};

export default stripeWebhookProductHandler({
  [STRIPE_ORG_PRODUCT_ID]: () => import("./_invoice.paid.org"),
});
