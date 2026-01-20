import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { monthlyProrationTaskConfig } from "./config";

const prorationInvoiceEmailSchema = z.object({
  prorationId: z.string(),
  teamId: z.number(),
  teamName: z.string(),
  monthKey: z.string(),
  seatsAdded: z.number(),
  remainingDays: z.number(),
  proratedAmount: z.number(),
});

export const sendProrationInvoiceEmail = schemaTask({
  id: "billing.proration.send-invoice-email",
  ...monthlyProrationTaskConfig,
  schema: prorationInvoiceEmailSchema,
  run: async (payload) => {
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { sendProrationInvoiceEmails } = await import("@calcom/emails/billing-email-service");
    const { sendProrationPaymentReminder } = await import("./sendProrationPaymentReminder");
    const { prisma } = await import("@calcom/prisma");
    const { getUserAndTeamWithBillingPermission } = await import(
      "@calcom/features/ee/billing/helpers/getUserAndTeamWithBillingPermission"
    );

    const triggerDevLogger = new TriggerDevLogger();
    const log = triggerDevLogger.getSubLogger({
      name: "SendProrationInvoiceEmail",
    });

    log.info(`Sending proration invoice email for team ${payload.teamId}`, {
      prorationId: payload.prorationId,
      monthKey: payload.monthKey,
    });

    const { team } = await getUserAndTeamWithBillingPermission({
      teamId: payload.teamId,
      prismaClient: prisma,
    });

    if (!team || team.adminAndOwners.length === 0) {
      log.warn(`No users with billing permission found for team ${payload.teamId}, skipping email`);
      return { status: "skipped", reason: "no_billing_users" };
    }

    await sendProrationInvoiceEmails({
      team: {
        id: payload.teamId,
        name: payload.teamName,
      },
      adminAndOwners: team.adminAndOwners,
      proration: {
        seatsAdded: payload.seatsAdded,
        monthKey: payload.monthKey,
        remainingDays: payload.remainingDays,
        proratedAmount: payload.proratedAmount,
      },
    });

    log.info(`Invoice email sent to ${team.adminAndOwners.length} users for team ${payload.teamId}`);

    log.info(`Scheduling payment reminder for team ${payload.teamId} in 7 days`);

    await sendProrationPaymentReminder.trigger(
      {
        prorationId: payload.prorationId,
        teamId: payload.teamId,
        teamName: payload.teamName,
        monthKey: payload.monthKey,
        seatsAdded: payload.seatsAdded,
        proratedAmount: payload.proratedAmount,
      },
      {
        delay: "7d",
      }
    );

    return {
      status: "sent",
      emailsSent: team.adminAndOwners.length,
      paymentReminderScheduled: true,
    };
  },
});
