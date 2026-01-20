import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { monthlyProrationTaskConfig } from "./config";

const prorationPaymentReminderSchema = z.object({
  prorationId: z.string(),
  teamId: z.number(),
  teamName: z.string(),
  monthKey: z.string(),
  seatsAdded: z.number(),
  proratedAmount: z.number(),
});

export const sendProrationPaymentReminder = schemaTask({
  id: "billing.proration.send-payment-reminder",
  ...monthlyProrationTaskConfig,
  schema: prorationPaymentReminderSchema,
  run: async (payload) => {
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { sendProrationPaymentReminderEmails } = await import("@calcom/emails/billing-email-service");
    const { MonthlyProrationRepository } = await import(
      "@calcom/features/ee/billing/repository/proration/MonthlyProrationRepository"
    );
    const { prisma } = await import("@calcom/prisma");
    const { getUserAndTeamWithBillingPermission } = await import(
      "@calcom/features/ee/billing/helpers/getUserAndTeamWithBillingPermission"
    );

    const triggerDevLogger = new TriggerDevLogger();
    const log = triggerDevLogger.getSubLogger({
      name: "SendProrationPaymentReminder",
    });

    log.info(`Checking payment status for proration ${payload.prorationId}`, {
      teamId: payload.teamId,
      monthKey: payload.monthKey,
    });

    const prorationRepository = new MonthlyProrationRepository();
    const proration = await prorationRepository.findById(payload.prorationId);

    if (!proration) {
      log.error(`Proration ${payload.prorationId} not found`);
      return { status: "error", reason: "proration_not_found" };
    }

    if (proration.status === "CHARGED") {
      log.info(`Proration ${payload.prorationId} already paid, skipping reminder`);
      return { status: "skipped", reason: "already_paid" };
    }

    if (proration.status === "FAILED") {
      log.info(`Proration ${payload.prorationId} failed, skipping reminder`);
      return { status: "skipped", reason: "proration_failed" };
    }

    log.info(`Sending payment reminder for team ${payload.teamId}`, {
      prorationId: payload.prorationId,
      status: proration.status,
    });

    const { team } = await getUserAndTeamWithBillingPermission({
      teamId: payload.teamId,
      prismaClient: prisma,
    });

    if (!team || team.adminAndOwners.length === 0) {
      log.warn(`No users with billing permission found for team ${payload.teamId}, skipping reminder`);
      return { status: "skipped", reason: "no_billing_users" };
    }

    await sendProrationPaymentReminderEmails({
      team: {
        id: payload.teamId,
        name: payload.teamName,
      },
      adminAndOwners: team.adminAndOwners,
      proration: {
        seatsAdded: payload.seatsAdded,
        monthKey: payload.monthKey,
        proratedAmount: payload.proratedAmount,
      },
    });

    log.info(`Payment reminder sent to ${team.adminAndOwners.length} users for team ${payload.teamId}`);

    return {
      status: "sent",
      emailsSent: team.adminAndOwners.length,
    };
  },
});
