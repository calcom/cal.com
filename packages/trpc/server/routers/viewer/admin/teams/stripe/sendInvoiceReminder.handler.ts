import { stripe } from "@calcom/app-store/_utils/stripe";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../../types";
import type { TSendInvoiceReminderSchema } from "./sendInvoiceReminder.schema";

type SendInvoiceReminderOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSendInvoiceReminderSchema;
};

export const sendInvoiceReminderHandler = async ({ input }: SendInvoiceReminderOptions) => {
  const { teamId, invoiceId } = input;

  // Verify team exists
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  try {
    // Send the invoice via Stripe
    await stripe.invoices.sendInvoice(invoiceId);

    return {
      success: true,
      message: "Invoice reminder sent successfully",
    };
  } catch (error) {
    console.error("Error sending invoice reminder:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to send invoice reminder",
    });
  }
};

export default sendInvoiceReminderHandler;
