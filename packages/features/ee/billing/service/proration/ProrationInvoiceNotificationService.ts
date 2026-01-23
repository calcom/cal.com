import type { TFunction } from "i18next";

import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { getTranslation } from "@calcom/lib/server/i18n";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import ProrationInvoiceEmail from "@calcom/emails/templates/proration-invoice-email";

import type { IBillingProviderService } from "../billingProvider/IBillingProviderService";
import { MonthlyProrationRepository } from "../../repository/proration/MonthlyProrationRepository";

const log = logger.getSubLogger({ prefix: ["ProrationInvoiceNotificationService"] });

interface InvoiceNotificationParams {
  prorationId: string;
  invoiceId: string;
  teamId: number;
}

interface UserWithTranslation {
  id: number;
  name: string | null;
  email: string;
  t: TFunction;
}

export class ProrationInvoiceNotificationService {
  private prisma: PrismaClient;
  private prorationRepository: MonthlyProrationRepository;
  private teamRepository: TeamRepository;
  private billingService: IBillingProviderService;

  constructor(
    private readonly deps: {
      prisma?: PrismaClient;
      billingService: IBillingProviderService;
    }
  ) {
    this.prisma = deps.prisma || defaultPrisma;
    this.prorationRepository = new MonthlyProrationRepository(this.prisma);
    this.teamRepository = new TeamRepository(this.prisma);
    this.billingService = deps.billingService;
  }

  async sendInvoiceCreatedNotification(params: InvoiceNotificationParams): Promise<void> {
    const { prorationId, invoiceId, teamId } = params;

    log.info("Sending invoice created notification", { prorationId, invoiceId, teamId });

    const { proration, team, invoice, recipients } = await this.getNotificationData(params);

    if (!proration || !team || !invoice || !recipients.length) {
      log.warn("Missing data for invoice notification", {
        prorationId,
        hasProration: !!proration,
        hasTeam: !!team,
        hasInvoice: !!invoice,
        recipientCount: recipients.length,
      });
      return;
    }

    if (!invoice.hostedInvoiceUrl) {
      log.warn("Invoice has no hosted URL, skipping notification", { prorationId, invoiceId });
      return;
    }

    const amountFormatted = this.formatAmount(invoice.amountDue, invoice.currency);

    for (const recipient of recipients) {
      try {
        const email = new ProrationInvoiceEmail({
          to: recipient.email,
          language: recipient.t,
          teamName: team.name || "",
          seatCount: proration.netSeatIncrease,
          amountFormatted,
          invoiceUrl: invoice.hostedInvoiceUrl,
          isReminder: false,
        });

        await email.sendEmail();

        log.info("Sent invoice created notification", {
          prorationId,
          invoiceId,
          recipientEmail: recipient.email,
        });
      } catch (error) {
        log.error("Failed to send invoice created notification", {
          prorationId,
          invoiceId,
          recipientEmail: recipient.email,
          error,
        });
      }
    }
  }

  async sendInvoiceReminderNotification(params: InvoiceNotificationParams): Promise<void> {
    const { prorationId, invoiceId, teamId } = params;

    log.info("Sending invoice reminder notification", { prorationId, invoiceId, teamId });

    const { proration, team, invoice, recipients } = await this.getNotificationData(params);

    if (!proration || !team || !invoice || !recipients.length) {
      log.warn("Missing data for invoice reminder notification", {
        prorationId,
        hasProration: !!proration,
        hasTeam: !!team,
        hasInvoice: !!invoice,
        recipientCount: recipients.length,
      });
      return;
    }

    // Skip if invoice is no longer open (paid, voided, etc.)
    if (invoice.status !== "open") {
      log.info("Invoice is not open, skipping reminder", {
        prorationId,
        invoiceId,
        status: invoice.status,
      });
      return;
    }

    if (!invoice.hostedInvoiceUrl) {
      log.warn("Invoice has no hosted URL, skipping reminder", { prorationId, invoiceId });
      return;
    }

    const amountFormatted = this.formatAmount(invoice.amountDue, invoice.currency);

    for (const recipient of recipients) {
      try {
        const email = new ProrationInvoiceEmail({
          to: recipient.email,
          language: recipient.t,
          teamName: team.name || "",
          seatCount: proration.netSeatIncrease,
          amountFormatted,
          invoiceUrl: invoice.hostedInvoiceUrl,
          isReminder: true,
        });

        await email.sendEmail();

        log.info("Sent invoice reminder notification", {
          prorationId,
          invoiceId,
          recipientEmail: recipient.email,
        });
      } catch (error) {
        log.error("Failed to send invoice reminder notification", {
          prorationId,
          invoiceId,
          recipientEmail: recipient.email,
          error,
        });
      }
    }
  }

  private async getNotificationData(params: InvoiceNotificationParams) {
    const { prorationId, invoiceId, teamId } = params;

    const [proration, team, invoice] = await Promise.all([
      this.prorationRepository.findById(prorationId),
      this.teamRepository.findById({ id: teamId }),
      this.billingService.getInvoice(invoiceId),
    ]);

    if (!team) {
      return { proration, team: null, invoice, recipients: [] };
    }

    const permission = team.isOrganization ? "organization.manageBilling" : "team.manageBilling";
    const users = await this.teamRepository.findTeamMembersWithPermission({
      teamId,
      permission,
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    const recipients: UserWithTranslation[] = await Promise.all(
      users.map(async (user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        t: await getTranslation(user.locale ?? "en", "common"),
      }))
    );

    return { proration, team, invoice, recipients };
  }

  private formatAmount(amountInCents: number, currency: string): string {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  }
}
