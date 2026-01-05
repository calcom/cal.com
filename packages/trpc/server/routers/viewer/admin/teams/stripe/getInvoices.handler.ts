import { stripe } from "@calcom/app-store/_utils/stripe";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../../types";
import type { TGetInvoicesSchema } from "./getInvoices.schema";

type GetInvoicesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInvoicesSchema;
};

export const getInvoicesHandler = async ({ input }: GetInvoicesOptions) => {
  const { teamId, limit, startingAfter } = input;

  // Get team to find billing info
  const [teamBilling, orgBilling, team] = await Promise.all([
    prisma.teamBilling.findUnique({
      where: { teamId },
      select: { customerId: true },
    }),
    prisma.organizationBilling.findUnique({
      where: { teamId },
      select: { customerId: true },
    }),
    prisma.team.findUnique({
      where: { id: teamId },
      select: { isOrganization: true },
    }),
  ]);

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  const billing = team.isOrganization ? orgBilling : teamBilling;

  if (!billing?.customerId) {
    // No billing set up, return empty array
    return {
      invoices: [],
      hasMore: false,
    };
  }

  try {
    const invoicesResponse = await stripe.invoices.list({
      customer: billing.customerId,
      limit,
      starting_after: startingAfter,
    });

    return {
      invoices: invoicesResponse.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        dueDate: invoice.due_date,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        paid: invoice.paid,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
      })),
      hasMore: invoicesResponse.has_more,
    };
  } catch (error) {
    console.error("Error fetching invoices from Stripe:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch invoices from Stripe",
    });
  }
};

export default getInvoicesHandler;
