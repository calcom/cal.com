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
    const { getTranslation } = await import("@calcom/lib/server/i18n");
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { sendProrationInvoiceEmails } = await import("@calcom/emails/billing-email-service");
    const { sendProrationPaymentReminder } = await import("./sendProrationPaymentReminder");
    const { prisma } = await import("@calcom/prisma");

    const triggerDevLogger = new TriggerDevLogger();
    const log = triggerDevLogger.getSubLogger({
      name: "SendProrationInvoiceEmail",
    });

    log.info(`Sending proration invoice email for team ${payload.teamId}`, {
      prorationId: payload.prorationId,
      monthKey: payload.monthKey,
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
      log.warn(`No admins found for team ${payload.teamId}, skipping email`);
      return { status: "skipped", reason: "no_admins" };
    }

    const adminAndOwners = await Promise.all(
      teamAdmins.map(async (membership) => ({
        name: membership.user.name,
        email: membership.user.email,
        t: await getTranslation(membership.user.locale ?? "en", "common"),
      }))
    );

    await sendProrationInvoiceEmails({
      team: {
        id: payload.teamId,
        name: payload.teamName,
      },
      adminAndOwners,
      proration: {
        seatsAdded: payload.seatsAdded,
        monthKey: payload.monthKey,
        remainingDays: payload.remainingDays,
        proratedAmount: payload.proratedAmount,
      },
    });

    log.info(`Invoice email sent to ${adminAndOwners.length} admins for team ${payload.teamId}`);

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
      emailsSent: adminAndOwners.length,
      paymentReminderScheduled: true,
    };
  },
});
