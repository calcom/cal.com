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
    const { getTranslation } = await import("@calcom/lib/server/i18n");
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { sendProrationPaymentReminderEmails } = await import("@calcom/emails/billing-email-service");
    const { MonthlyProrationRepository } = await import(
      "@calcom/features/ee/billing/repository/proration/MonthlyProrationRepository"
    );
    const { prisma } = await import("@calcom/prisma");

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

    const teamAdmins = await prisma.membership.findMany({
      where: {
        teamId: payload.teamId,
        role: { in: ["ADMIN", "OWNER"] },
        accepted: true,
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            locale: true,
          },
        },
      },
    });

    if (teamAdmins.length === 0) {
      log.warn(`No admins found for team ${payload.teamId}, skipping reminder`);
      return { status: "skipped", reason: "no_admins" };
    }

    const adminAndOwners = await Promise.all(
      teamAdmins.map(async (membership) => ({
        name: membership.user.name,
        email: membership.user.email,
        t: await getTranslation(membership.user.locale ?? "en", "common"),
      }))
    );

    await sendProrationPaymentReminderEmails({
      team: {
        id: payload.teamId,
        name: payload.teamName,
      },
      adminAndOwners,
      proration: {
        seatsAdded: payload.seatsAdded,
        monthKey: payload.monthKey,
        proratedAmount: payload.proratedAmount,
      },
    });

    log.info(`Payment reminder sent to ${adminAndOwners.length} admins for team ${payload.teamId}`);

    return {
      status: "sent",
      emailsSent: adminAndOwners.length,
    };
  },
});
