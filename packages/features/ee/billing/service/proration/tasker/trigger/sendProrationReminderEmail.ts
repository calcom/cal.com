import { schemaTask } from "@trigger.dev/sdk";
import { prorationEmailTaskConfig } from "./emailConfig";
import { sendReminderEmailSchema } from "./emailSchemas";

export const sendProrationReminderEmail = schemaTask({
  id: "billing.proration.send-reminder-email",
  ...prorationEmailTaskConfig,
  schema: sendReminderEmailSchema,
  run: async (payload) => {
    const { ProrationEmailService } = await import("../../ProrationEmailService");
    const emailService = new ProrationEmailService();
    await emailService.sendReminderEmail(payload);
    return { success: true };
  },
});
