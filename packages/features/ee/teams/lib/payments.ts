import { Stripe } from "stripe";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { CAL_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

export type BillingFrequency = "monthly" | "yearly";

export const getTeamPricing = async () => {
  if (!process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || !process.env.STRIPE_TEAM_YEARLY_PRICE_ID)
    throw new Error("Missing Stripe price ids");
  const monthlyPriceQuery = await stripe.prices.retrieve(process.env.STRIPE_TEAM_MONTHLY_PRICE_ID);
  const yearlyPriceQuery = await stripe.prices.retrieve(process.env.STRIPE_TEAM_YEARLY_PRICE_ID);
  if (!monthlyPriceQuery.unit_amount || !yearlyPriceQuery.unit_amount) return null;
  return {
    monthly: monthlyPriceQuery.unit_amount / 100,
    yearly: yearlyPriceQuery.unit_amount / 100,
  };
};

export const searchForTeamCustomer = async (teamName: string, ownerEmail: string) => {
  // Search to see if the customer is already in Stripe
  const customer = await stripe.customers.search({
    query: `name: \'${teamName}\' AND email: \'${ownerEmail}\'`,
  });

  return customer.data[0];
};

export const createTeamCustomer = async (teamName: string, ownerEmail: string) => {
  return await stripe.customers.create({
    name: teamName,
    email: ownerEmail,
  });
};

export const retrieveTeamCustomer = async (customerId: string) => {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw new Error("Customer has been deleted off Stripe");
  return customer as Stripe.Customer;
};

export const updateTeamCustomerName = async (customerId: string, teamName: string) => {
  return await stripe.customers.update(customerId, { name: teamName });
};

export const createTeamSubscription = async (customerId: string, billingFrequency: string, seats: number) => {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price:
          billingFrequency === "monthly"
            ? process.env.STRIPE_TEAM_MONTHLY_PRICE_ID
            : process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
        quantity: seats,
      },
    ],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  });

  return subscription as Stripe.Subscription & {
    quantity: number;
    latest_invoice: Stripe.Invoice & { payment_intent: Stripe.PaymentIntent };
  };
};

export const retrieveTeamSubscription = async ({
  subscriptionId,
  customerId,
}: {
  subscriptionId?: string;
  customerId?: string;
}) => {
  if (!subscriptionId && !customerId) throw new Error("No Stripe subscriptions found");
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });
    return subscription as unknown as Stripe.Subscription & {
      quantity: number;
      latest_invoice: Stripe.Invoice & { payment_intent: Stripe.PaymentIntent };
    };
  }

  if (customerId) {
    const subscription = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 1,
      expand: ["data.latest_invoice.payment_intent"],
    });
    return subscription.data[0] as Stripe.Subscription & {
      quantity: number;
      latest_invoice: Stripe.Invoice & { payment_intent: Stripe.PaymentIntent };
    };
  }
};

export const deleteTeamSubscriptionQuantity = async (subscriptionId: string) => {
  return await stripe.subscriptions.del(subscriptionId);
};

export const purchaseTeamSubscription = async (input: { teamId: number; seats: number; email: string }) => {
  const { teamId, seats, email } = input;
  return await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${CAL_URL}/settings/teams/${teamId}/profile`,
    cancel_url: `${CAL_URL}/settings/profile`,
    locale: "en",
    line_items: [
      {
        /** We only need to set the base price and we can upsell it directly on Stripe's checkout  */
        price: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
        quantity: seats,
      },
    ],
    customer_email: email,
    metadata: {
      teamId,
    },
    payment_method_types: ["card"],
    subscription_data: {
      metadata: {
        teamId,
      },
    },
  });
};

export const getStripeIdsForTeam = async (teamId: number) => {
  const teamQuery = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: {
      metadata: true,
    },
  });

  const teamStripeIds = { ...teamQuery.metadata };

  return teamStripeIds;
};

export const deleteTeamFromStripe = async (teamId: number) => {
  const stripeCustomerId = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: { metadata: true },
  });

  if (stripeCustomerId?.metadata?.stripeCustomerId) {
    await stripe.customers.del(stripeCustomerId.metadata.stripeCustomerId);
    return;
  } else {
    console.error(`Couldn't deleteTeamFromStripe, Team id: ${teamId} didn't have a stripeCustomerId`);
  }
};

export const createPaymentIntent = ({ amount, receiptEmail }: { amount: number; receiptEmail: string }) => {
  return stripe.paymentIntents.create({
    amount,
    currency: "usd",
    receipt_email: receiptEmail,
  });
};

export const updatePaymentIntent = ({
  amount,
  paymentIntentId,
}: {
  amount: number;
  paymentIntentId: string;
}) => {
  return stripe.paymentIntents.update(paymentIntentId, {
    amount: amount * 100,
  });
};
