export async function downgradeSubscription(stripeCustomerId: string) {
  try {
    const stripeCustomerId = await getStripeCustomerIdFromUserId(userId);
    if (!stripeCustomerId) {
      throw "Stripe Customer not found on stripe end";
    }
  } catch (error) {
    throw new Error(error.message);
  }
}
