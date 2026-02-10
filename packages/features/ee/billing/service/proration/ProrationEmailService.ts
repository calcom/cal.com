import type { TFunction } from "i18next";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

import { getUserAndTeamWithBillingPermission } from "../../helpers/getUserAndTeamWithBillingPermission";
import { MonthlyProrationRepository } from "../../repository/proration/MonthlyProrationRepository";

const log = logger.getSubLogger({ prefix: ["ProrationEmailService"] });

interface UserWithBillingAccess {
  id: number;
  name: string | null;
  email: string;
  t: TFunction;
}

export interface SendInvoiceEmailParams {
  prorationId: string;
  teamId: number;
  isAutoCharge: boolean;
}

export interface SendReminderEmailParams {
  prorationId: string;
  teamId: number;
}

export class ProrationEmailService {
  private prorationRepository: MonthlyProrationRepository;

  constructor() {
    this.prorationRepository = new MonthlyProrationRepository();
  }

  async sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<void> {
    const { prorationId, teamId, isAutoCharge } = params;

    log.debug(`Processing invoice email for prorationId ${prorationId}, teamId ${teamId}`);

    const proration = await this.prorationRepository.findForEmail(prorationId);
    if (!proration) {
      log.warn(`Proration ${prorationId} not found, skipping invoice email`);
      return;
    }

    const { team } = await getUserAndTeamWithBillingPermission({
      teamId,
      prismaClient: prisma,
    });

    if (!team) {
      log.warn(`Team ${teamId} not found, skipping invoice email`);
      return;
    }

    if (team.adminAndOwners.length === 0) {
      log.warn(`No users with billing permission found for team ${teamId}, skipping invoice email`);
      return;
    }

    const invoiceUrl = await this.getInvoiceUrl(proration.invoiceId);

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
      adminAndOwners: team.adminAndOwners,
    });

    log.debug(`Successfully sent proration invoice emails for prorationId ${prorationId}`);
  }

  async sendReminderEmail(params: SendReminderEmailParams): Promise<void> {
    const { prorationId, teamId } = params;

    log.debug(`Processing reminder email for prorationId ${prorationId}, teamId ${teamId}`);

    const proration = await this.prorationRepository.findForEmail(prorationId);
    if (!proration) {
      log.warn(`Proration ${prorationId} not found, skipping reminder email`);
      return;
    }

    if (proration.status === "CHARGED") {
      log.debug(`Proration ${prorationId} already charged, skipping reminder email`);
      return;
    }

    const { team } = await getUserAndTeamWithBillingPermission({
      teamId,
      prismaClient: prisma,
    });

    if (!team) {
      log.warn(`Team ${teamId} not found, skipping reminder email`);
      return;
    }

    if (team.adminAndOwners.length === 0) {
      log.warn(`No users with billing permission found for team ${teamId}, skipping reminder email`);
      return;
    }

    const invoiceUrl = await this.getInvoiceUrl(proration.invoiceId);

    const { default: ProrationReminderEmail } = await import(
      "@calcom/emails/templates/proration-reminder-email"
    );

    const emailPromises = team.adminAndOwners.map(async (user: UserWithBillingAccess) => {
      const email = new ProrationReminderEmail({
        user: {
          name: user.name,
          email: user.email,
          t: user.t,
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
  }

  private async getInvoiceUrl(invoiceId: string | null): Promise<string | null> {
    if (!invoiceId) return null;

    try {
      const { default: stripe } = await import("@calcom/features/ee/payments/server/stripe");
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return invoice.hosted_invoice_url ?? null;
    } catch (error) {
      log.warn(`Failed to retrieve invoice URL for ${invoiceId}`, safeStringify(error));
      return null;
    }
  }
}
