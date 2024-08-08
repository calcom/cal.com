import type { LazyModule, SWHMap } from "./__handler";

type Data = SWHMap["customer.subscription.deleted"]["data"];

type Handlers = Record<`prod_${string}`, LazyModule<Data>>;

const STRIPE_TEAM_PRODUCT_ID = process.env.STRIPE_TEAM_PRODUCT_ID || "";

const stripeWebhookProductHandler = (handlers: Handlers) => async (data: Data) => {
  const subscription = data.object;
  // @ts-expect-error - we know subscription.plan.product is defined when unsubscribing
  const productId = subscription.plan.product; // prod_xxxxx
  const handler = (await handlers[productId])?.default;
  // auto catch unsupported Stripe products.
  if (!handler) throw new Error(`No product handler found for product: ${productId}`);
  return await handler(data);
};

export default stripeWebhookProductHandler({
  [STRIPE_TEAM_PRODUCT_ID]: import("./_customer.subscription.deleted.team-plan"),
});
