import { createSendWebhookTask } from "@calcom/features/tasker/tasks/createSendWebhookTask";

import type sendPayload from "./sendPayload";

type SchedulePayload = typeof sendPayload;

const schedulePayload: SchedulePayload = async (secretKey, triggerEvent, createdAt, webhook, data) => {
  await createSendWebhookTask(JSON.stringify({ secretKey, triggerEvent, createdAt, webhook, data }));
  return {
    ok: true,
    status: 200,
    message: "Webhook scheduled successfully",
  };
};

export default schedulePayload;
