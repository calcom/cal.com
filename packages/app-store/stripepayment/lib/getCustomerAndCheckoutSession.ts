import stripe from "@calcom/app-store/stripepayment/lib/server";

export async function getCustomerAndCheckoutSession(checkoutSessionId: string) {
  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const customerOrCustomerId = checkoutSession.customer;
  let customerId = null;

  if (!customerOrCustomerId) {
    return { checkoutSession, customer: null };
  }

  if (typeof customerOrCustomerId === "string") {
    customerId = customerOrCustomerId;
  } else if (customerOrCustomerId.deleted) {
    return { checkoutSession, customer: null };
  } else {
    customerId = customerOrCustomerId.id;
  }
  const stripeCustomer = await stripe.customers.retrieve(customerId);
  if (stripeCustomer.deleted) {
    return { checkoutSession, customer: null };
  }
  return { stripeCustomer, checkoutSession };
}
