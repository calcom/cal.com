import { getBillingProviderService } from "@calcom/features/ee/billing/di/containers/Billing";

export async function getCustomerAndCheckoutSession(checkoutSessionId: string) {
  const billingService = getBillingProviderService();
  const checkoutSession = await billingService.getCheckoutSession(checkoutSessionId);
  const customerOrCustomerId = checkoutSession.customer;
  let customerId = null;

  if (!customerOrCustomerId) {
    return { checkoutSession, stripeCustomer: null };
  }

  if (typeof customerOrCustomerId === "string") {
    customerId = customerOrCustomerId;
  } else if (customerOrCustomerId.deleted) {
    return { checkoutSession, stripeCustomer: null };
  } else {
    customerId = customerOrCustomerId.id;
  }
  const stripeCustomer = await billingService.getCustomer(customerId);
  if (stripeCustomer.deleted) {
    return { checkoutSession, stripeCustomer: null };
  }
  return { stripeCustomer, checkoutSession };
}
