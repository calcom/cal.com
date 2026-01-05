import { stripe } from "@calcom/app-store/_utils/stripe";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../../types";
import type { TGetPaymentsSchema } from "./getPayments.schema";

type GetPaymentsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetPaymentsSchema;
};

export const getPaymentsHandler = async ({ input }: GetPaymentsOptions) => {
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
    return {
      payments: [],
      hasMore: false,
    };
  }

  try {
    const paymentsResponse = await stripe.paymentIntents.list({
      customer: billing.customerId,
      limit,
      starting_after: startingAfter,
    });

    return {
      payments: paymentsResponse.data.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        created: payment.created,
        description: payment.description,
        receiptEmail: payment.receipt_email,
        paymentMethod: payment.payment_method,
        lastPaymentError: payment.last_payment_error
          ? {
              code: payment.last_payment_error.code,
              message: payment.last_payment_error.message,
            }
          : null,
      })),
      hasMore: paymentsResponse.has_more,
    };
  } catch (error) {
    console.error("Error fetching payments from Stripe:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch payments from Stripe",
    });
  }
};

export default getPaymentsHandler;
