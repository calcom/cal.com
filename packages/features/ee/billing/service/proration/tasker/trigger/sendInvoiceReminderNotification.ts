import { schemaTask } from "@trigger.dev/sdk";

import { MembershipRole } from "@calcom/prisma/enums";

import { monthlyProrationTaskConfig } from "./config";
import { invoiceNotificationSchema } from "./invoiceNotificationSchema";
import { sendInvoiceEmail } from "./sendInvoiceEmail";

export const sendInvoiceReminderNotification = schemaTask({
  id: "billing.proration-invoice.reminder-notification",
  ...monthlyProrationTaskConfig,
  schema: invoiceNotificationSchema,
  run: async (payload) => {
    const { TeamRepository } = await import("@calcom/features/ee/teams/repositories/TeamRepository");
    const { MonthlyProrationRepository } = await import(
      "@calcom/features/ee/billing/repository/proration/MonthlyProrationRepository"
    );
    const { StripeBillingService } = await import(
      "@calcom/features/ee/billing/service/billingProvider/StripeBillingService"
    );
    const stripe = (await import("@calcom/features/ee/payments/server/stripe")).default;
    const { prisma } = await import("@calcom/prisma");

    const prorationRepository = new MonthlyProrationRepository(prisma);
    const teamRepository = new TeamRepository(prisma);
    const billingService = new StripeBillingService(stripe);

    const [proration, team, invoice] = await Promise.all([
      prorationRepository.findById(payload.prorationId),
      teamRepository.findById({ id: payload.teamId }),
      billingService.getInvoice(payload.invoiceId),
    ]);

    if (!proration || !team || !invoice) {
      return {
        success: false,
        reason: "Missing data",
        hasProration: !!proration,
        hasTeam: !!team,
        hasInvoice: !!invoice,
      };
    }

    // Skip if invoice is no longer open (paid, voided, etc.)
    if (invoice.status !== "open") {
      return {
        success: true,
        skipped: true,
        reason: `Invoice status is ${invoice.status}, not open`,
      };
    }

    if (!invoice.hostedInvoiceUrl) {
      return { success: false, reason: "Invoice has no hosted URL" };
    }

    const permission = team.isOrganization ? "organization.manageBilling" : "team.manageBilling";
    const recipients = await teamRepository.findTeamMembersWithPermission({
      teamId: payload.teamId,
      permission,
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (recipients.length === 0) {
      return { success: false, reason: "No recipients with billing permission" };
    }

    const amountFormatted = formatAmount(invoice.amountDue, invoice.currency);

    // Batch trigger individual reminder emails for each recipient
    const emailPayloads = recipients.map((recipient) => ({
      payload: {
        prorationId: payload.prorationId,
        invoiceId: payload.invoiceId,
        teamId: payload.teamId,
        recipientEmail: recipient.email,
        recipientLocale: recipient.locale ?? "en",
        teamName: team.name ?? "",
        seatCount: proration.netSeatIncrease,
        amountFormatted,
        invoiceUrl: invoice.hostedInvoiceUrl!,
        isReminder: true,
      },
    }));

    const batchResult = await sendInvoiceEmail.batchTrigger(emailPayloads);

    return {
      success: true,
      recipientCount: recipients.length,
      batchId: batchResult.batchId,
      runs: batchResult.runs.map((run) => run.id),
    };
  },
});

function formatAmount(amountInCents: number, currency: string): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}
