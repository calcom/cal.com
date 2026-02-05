import { runs, schemaTask } from "@trigger.dev/sdk";

import { prorationEmailTaskConfig } from "./emailConfig";
import { cancelReminderSchema } from "./emailSchemas";
import { sendProrationReminderEmail } from "./sendProrationReminderEmail";

export const cancelProrationReminder = schemaTask({
  id: "billing.proration.cancel-reminder",
  ...prorationEmailTaskConfig,
  schema: cancelReminderSchema,
  run: async (payload) => {
    const idempotencyKey = `proration-reminder-${payload.prorationId}`;

    // Find and cancel any scheduled reminder runs with this idempotency key
    // Use for-await to auto-paginate through all results
    for await (const run of runs.list({
      taskIdentifier: [sendProrationReminderEmail.id],
      status: ["DELAYED", "WAITING_FOR_DEPLOY", "QUEUED", "PENDING"],
    })) {
      if (run.idempotencyKey === idempotencyKey) {
        await runs.cancel(run.id);
      }
    }

    return { success: true };
  },
});
