import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { z } from "zod";

const log = logger.getSubLogger({ prefix: ["sendProrationReminderEmail"] });

export const sendProrationReminderEmailPayloadSchema = z.object({
  prorationId: z.string(),
  teamId: z.number(),
});

export async function sendProrationReminderEmail(payload: string): Promise<void> {
  try {
    const { prorationId, teamId } = sendProrationReminderEmailPayloadSchema.parse(JSON.parse(payload));

    log.debug(`Processing sendProrationReminderEmail task for prorationId ${prorationId}, teamId ${teamId}`);

    const proration = await prisma.monthlyProration.findUnique({
      where: { id: prorationId },
    });

    if (!proration) {
      log.warn(`Proration ${prorationId} not found, skipping reminder email`);
      return;
    }

    if (proration.status === "CHARGED") {
      log.debug(`Proration ${prorationId} already charged, skipping reminder email`);
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
      log.warn(`Team ${teamId} not found, skipping reminder email`);
      return;
    }

    if (team.members.length === 0) {
      log.warn(`No admin/owner members found for team ${teamId}, skipping reminder email`);
      return;
    }

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
    const { default: ProrationReminderEmail } = await import(
      "@calcom/emails/templates/proration-reminder-email"
    );

    const emailPromises = team.members.map(async (member) => {
      const t = await getTranslation(member.user.locale ?? "en", "common");
      const email = new ProrationReminderEmail({
        user: {
          name: member.user.name,
          email: member.user.email,
          t,
        },
        team: {
          id: team.id,
          name: team.name,
        },
        proration: {
          monthKey: proration.monthKey,
          netSeatIncrease: proration.netSeatIncrease,
          proratedAmount: proration.proratedAmount,
        },
        invoiceUrl,
      });
      return email.sendEmail();
    });

    await Promise.all(emailPromises);

    log.debug(`Successfully sent proration reminder emails for prorationId ${prorationId}`);
  } catch (error) {
    log.error(
      `Failed to send proration reminder email`,
      safeStringify({ payload, error: error instanceof Error ? error.message : String(error) })
    );
    throw error;
  }
}
