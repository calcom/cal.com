import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { z } from "zod";

const log = logger.getSubLogger({ prefix: ["sendProrationInvoiceEmail"] });

export const sendProrationInvoiceEmailPayloadSchema = z.object({
  prorationId: z.string(),
  teamId: z.number(),
  isAutoCharge: z.boolean(),
});

export async function sendProrationInvoiceEmail(payload: string): Promise<void> {
  try {
    const { prorationId, teamId, isAutoCharge } = sendProrationInvoiceEmailPayloadSchema.parse(
      JSON.parse(payload)
    );

    log.debug(`Processing sendProrationInvoiceEmail task for prorationId ${prorationId}, teamId ${teamId}`);

    const proration = await prisma.monthlyProration.findUnique({
      where: { id: prorationId },
    });

    if (!proration) {
      log.warn(`Proration ${prorationId} not found, skipping invoice email`);
      return;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        members: {
          where: {
            accepted: true,
            role: {
              in: ["OWNER", "ADMIN"],
            },
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
        },
      },
    });

    if (!team) {
      log.warn(`Team ${teamId} not found, skipping invoice email`);
      return;
    }

    if (team.members.length === 0) {
      log.warn(`No admin/owner members found for team ${teamId}, skipping invoice email`);
      return;
    }

    // Get invoice URL from Stripe
    let invoiceUrl: string | null = null;
    if (proration.invoiceId) {
      const { default: stripe } = await import("@calcom/features/ee/payments/server/stripe");
      try {
        const invoice = await stripe.invoices.retrieve(proration.invoiceId);
        invoiceUrl = invoice.hosted_invoice_url ?? null;
      } catch (error) {
        log.warn(`Failed to retrieve invoice URL for ${proration.invoiceId}`, safeStringify(error));
      }
    }

    const { getTranslation } = await import("@calcom/lib/server/i18n");

    const adminAndOwners = await Promise.all(
      team.members.map(async (member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        t: await getTranslation(member.user.locale ?? "en", "common"),
      }))
    );

    const { sendProrationInvoiceEmails } = await import("@calcom/emails/billing-email-service");
    await sendProrationInvoiceEmails({
      team: { id: team.id, name: team.name },
      proration: {
        monthKey: proration.monthKey,
        netSeatIncrease: proration.netSeatIncrease,
        proratedAmount: proration.proratedAmount,
      },
      invoiceUrl,
      isAutoCharge,
      adminAndOwners,
    });

    log.debug(`Successfully sent proration invoice emails for prorationId ${prorationId}`);

    // Schedule reminder email for 7 days later (only for non-auto-charge invoices)
    if (!isAutoCharge) {
      const { getTasker } = await import("@calcom/features/tasker");
      const tasker = await getTasker();
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await tasker.create(
        "sendProrationReminderEmail",
        { prorationId, teamId },
        {
          scheduledAt: sevenDaysFromNow,
          referenceUid: `proration-reminder-${prorationId}`,
        }
      );

      log.debug(`Scheduled proration reminder email for prorationId ${prorationId}`, {
        scheduledAt: sevenDaysFromNow,
      });
    }
  } catch (error) {
    log.error(
      `Failed to send proration invoice email`,
      safeStringify({ payload, error: error instanceof Error ? error.message : String(error) })
    );
    throw error;
  }
}
