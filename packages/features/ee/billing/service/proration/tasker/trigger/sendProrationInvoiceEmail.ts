import { schemaTask } from "@trigger.dev/sdk";

import { prorationEmailTaskConfig } from "./emailConfig";
import { sendInvoiceEmailSchema } from "./emailSchemas";

export const sendProrationInvoiceEmail = schemaTask({
  id: "billing.proration.send-invoice-email",
  ...prorationEmailTaskConfig,
  schema: sendInvoiceEmailSchema,
  run: async (payload) => {
    const { ProrationEmailService } = await import("../../ProrationEmailService");
    const emailService = new ProrationEmailService();
    await emailService.sendInvoiceEmail(payload);
    return { success: true };
  },
});
