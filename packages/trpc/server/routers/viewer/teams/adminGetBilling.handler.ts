import type Stripe from "stripe";

import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetTeamBilling } from "./adminGetBilling.schema";
import { adminFindTeamById } from "./adminUtils";

type AdminGetTeamBillingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetTeamBilling;
};

export const adminGetTeamBillingHandler = async ({ input }: AdminGetTeamBillingOptions) => {
  const team = await adminFindTeamById(prisma, input.id);
  const parsedMetadata = teamMetadataSchema.parse(team.metadata);

  let subscriptionDetails = null;
  let invoices: Stripe.Invoice[] = [];
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;
  let stripeSubscriptionItemId: string | null = null;

  // Get subscription ID from team metadata
  stripeSubscriptionId = parsedMetadata?.subscriptionId || null;
  stripeSubscriptionItemId = parsedMetadata?.subscriptionItemId || null;

  const billingService = new StripeBillingService();

  // If we have a subscription ID but no customer ID, fetch the subscription to get the customer ID
  if (stripeSubscriptionId && !stripeCustomerId) {
    try {
      const subscription = await billingService.getSubscription(stripeSubscriptionId);
      stripeCustomerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      subscriptionDetails = subscription;
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  } else if (stripeSubscriptionId && stripeCustomerId) {
    // We have both, just fetch subscription details
    try {
      subscriptionDetails = await billingService.getSubscription(stripeSubscriptionId);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  }

  // If we have a customer ID, fetch invoices
  if (stripeCustomerId) {
    try {
      invoices = await billingService.getInvoices(stripeCustomerId, 10);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  }

  return {
    stripeCustomerId,
    stripeSubscriptionId,
    stripeSubscriptionItemId,
    subscriptionId: parsedMetadata?.subscriptionId || null,
    subscriptionItemId: parsedMetadata?.subscriptionItemId || null,
    // orgSeats and orgPricePerSeat are used for organizations (and potentially teams)
    seats: parsedMetadata?.orgSeats || null,
    pricePerSeat: parsedMetadata?.orgPricePerSeat || null,
    billingPeriod: parsedMetadata?.billingPeriod || null,
    subscriptionDetails: subscriptionDetails
      ? {
          status: subscriptionDetails.status,
          currentPeriodStart: subscriptionDetails.current_period_start,
          currentPeriodEnd: subscriptionDetails.current_period_end,
          cancelAtPeriodEnd: subscriptionDetails.cancel_at_period_end,
          canceledAt: subscriptionDetails.canceled_at,
        }
      : null,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    })),
  };
};

export default adminGetTeamBillingHandler;
