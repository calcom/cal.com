import { HttpCode } from "./__handler";
import type { LazyModule, SWHMap } from "./__handler";

type Data = SWHMap["invoice.paid"]["data"];

type Handlers = Record<`prod_${string}`, () => LazyModule<Data>>;

const STRIPE_ORG_PRODUCT_ID = process.env.STRIPE_ORG_PRODUCT_ID || "";

const stripeWebhookProductHandler = (handlers: Handlers) => async (data: Data) => {
  const invoice = data.object;
  console.log("invoice.paid webhook received", invoice);
  // Only handle subscription invoices
  if (!invoice.subscription) {
    console.log("Not a subscription invoice, skipping");
    return { success: true };
  }

  // Get the product ID from the first subscription item
  // @ts-expect-error - we know lines.data exists and has items for subscription invoices
  const firstItem = invoice.lines.data[0];
  const productId = firstItem?.price?.product as string; // prod_xxxxx

  if (!productId) {
    console.log("No product ID found in invoice, skipping");
    return { success: true };
  }

  const handlerGetter = handlers[productId];
  console.log("handlers", {
    productId,
    handlers,
    handlerGetter,
  });
  if (!handlerGetter) throw new HttpCode(202, `No product handler found for product: ${productId}`);
  const handler = (await handlerGetter())?.default;
  // auto catch unsupported Stripe products.
  if (!handler) throw new HttpCode(202, `No product handler found for product: ${productId}`);
  return await handler(data);
};

export default stripeWebhookProductHandler({
  [STRIPE_ORG_PRODUCT_ID]: () => import("./_invoice.paid.org"),
});
