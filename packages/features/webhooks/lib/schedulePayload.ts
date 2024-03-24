import tasker from "@calcom/features/tasker";

import type sendPayload from "./sendPayload";

type SchedulePayload = (...args: Parameters<typeof sendPayload>) => Promise<void>;

const schedulePayload: SchedulePayload = async (secretKey, triggerEvent, createdAt, webhook, data) => {
  await tasker.create("sendWebhook", JSON.stringify({ secretKey, triggerEvent, createdAt, webhook, data }));
};

export default schedulePayload;
