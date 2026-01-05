import stripe from "./server";

interface IRetrieveSubscriptionIdResponse {
  message?: string;
  subscriptionId?: string;
}

export async function retrieveSubscriptionIdFromStripeCustomerId(
  stripeCustomerId: string
): Promise<IRetrieveSubscriptionIdResponse> {
  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand: ["subscriptions.data.plan"],
  });
  if (!customer || customer.deleted) {
    return {
      message: "Not found",
    };
  }

  const subscription = customer.subscriptions?.data[0];
  if (!subscription) {
    return {
      message: "Not found",
    };
  }
  return {
    subscriptionId: subscription.id,
  };
}

export async function getSubscriptionFromId(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}
