import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import { OrganizationOnboardingRepository } from "@calcom/lib/server/repository/organizationOnboarding";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetBilling } from "./adminGetBilling.schema";

type AdminGetBillingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetBilling;
};

export const adminGetBillingHandler = async ({ input }: AdminGetBillingOptions) => {
  const org = await OrganizationRepository.adminFindById({ id: input.id });
  const parsedMetadata = teamMetadataSchema.parse(org.metadata);

  // Get organization onboarding data which contains Stripe customer ID
  const onboarding = await OrganizationOnboardingRepository.findByOrganizationId(input.id);

  let subscriptionDetails = null;
  let invoices: any[] = [];

  if (onboarding?.stripeCustomerId) {
    const billingService = new StripeBillingService();

    // Get subscription details if subscription ID exists
    if (onboarding.stripeSubscriptionId) {
      try {
        subscriptionDetails = await billingService.getSubscription(onboarding.stripeSubscriptionId);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    }

    // Get recent invoices
    try {
      invoices = await billingService.getInvoices(onboarding.stripeCustomerId, 10);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  }

  return {
    stripeCustomerId: onboarding?.stripeCustomerId || null,
    stripeSubscriptionId: onboarding?.stripeSubscriptionId || null,
    stripeSubscriptionItemId: onboarding?.stripeSubscriptionItemId || null,
    subscriptionId: parsedMetadata?.subscriptionId || null,
    subscriptionItemId: parsedMetadata?.subscriptionItemId || null,
    billingPeriod: onboarding?.billingPeriod || null,
    seats: onboarding?.seats || parsedMetadata?.orgSeats || null,
    pricePerSeat: onboarding?.pricePerSeat || parsedMetadata?.orgPricePerSeat || null,
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

export default adminGetBillingHandler;
