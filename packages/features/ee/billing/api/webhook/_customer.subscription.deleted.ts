import type { LazyModule, SWHMap } from "./__handler";

type Data = SWHMap["customer.subscription.deleted"]["data"];

type Handlers = Record<`prod_${string}`, LazyModule<Data>>;

const stripeWebhookProductHandler = (handlers: Handlers) => async (data: Data) => {
  const subscription = data.object;
  // @ts-expect-error - we know subscription.plan.product is defined when unsubscribing
  const product = subscription.plan.product; // prod_QHXJrukWIu9X66
  const handler = (await handlers[product])?.default;
  // auto catch unsupported Stripe products.
  if (!handler) throw new Error(`No product handler found for product: ${product}`);
  await handler(data);
};

export default stripeWebhookProductHandler({
  prod_QHXJrukWIu9X66: import("./_customer.subscription.deleted.team-plan"),
});
