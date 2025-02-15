import { HttpCode } from "./__handler";
import type { LazyModule, SWHMap } from "./__handler";
import logger from "@calcom/lib/logger";

type Data = SWHMap["invoice.paid"]["data"];

type Handlers = Record<`prod_${string}`, () => LazyModule<Data>>;

// We can't crash here if STRIPE_ORG_PRODUCT_ID is not set, because not all self-hosters use Organizations and it might break the build on import of this module.
const STRIPE_ORG_PRODUCT_ID = process.env.STRIPE_ORG_PRODUCT_ID || "";

const log = logger.getSubLogger({ prefix: ["stripe-webhook-invoice-paid"] });

const stripeWebhookProductHandler = (handlers: Handlers) => async (data: Data) => {
  const invoice = data.object;
  // Only handle subscription invoices
  if (!invoice.subscription) {
    log.warn("Not a subscription invoice, skipping");
    return { success: true };
  }

  // Get the product ID from the first subscription item
  const firstItem = invoice.lines.data[0];
  const productId = firstItem?.price?.product as string; // prod_xxxxx

  if (!productId) {
    log.error("No product ID found in invoice, skipping");
    return { success: true };
  }

  const handlerGetter = handlers[productId as keyof typeof handlers];
  if (!handlerGetter) throw new HttpCode(202, `No product handler found for product: ${productId}`);
  const handler = (await handlerGetter())?.default;
  // auto catch unsupported Stripe products.
  if (!handler) throw new HttpCode(202, `No product handler found for product: ${productId}`);
  return await handler(data);
};

export default stripeWebhookProductHandler({
  [STRIPE_ORG_PRODUCT_ID]: () => import("./_invoice.paid.org"),
});
