import { schemaTask } from "@trigger.dev/sdk";

import { monthlyProrationTaskConfig } from "./config";
import { invoiceEmailSchema } from "./invoiceNotificationSchema";

export const sendInvoiceEmail = schemaTask({
  id: "billing.proration-invoice.send-email",
  ...monthlyProrationTaskConfig,
  schema: invoiceEmailSchema,
  run: async (payload) => {
    const { getTranslation } = await import("@calcom/lib/server/i18n");
    const ProrationInvoiceEmail = (await import("@calcom/emails/templates/proration-invoice-email")).default;

    const t = await getTranslation(payload.recipientLocale, "common");

    const email = new ProrationInvoiceEmail({
      to: payload.recipientEmail,
      language: t,
      teamName: payload.teamName,
      seatCount: payload.seatCount,
      amountFormatted: payload.amountFormatted,
      invoiceUrl: payload.invoiceUrl,
      isReminder: payload.isReminder,
    });

    await email.sendEmail();

    return {
      success: true,
      recipientEmail: payload.recipientEmail,
      isReminder: payload.isReminder,
    };
  },
});
