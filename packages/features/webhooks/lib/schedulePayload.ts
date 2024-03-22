import type { Webhook } from "@prisma/client";

import tasker from "@calcom/features/tasker";

import type { WebhookDataType } from "./sendPayload";

const schedulePayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  data: Omit<WebhookDataType, "createdAt" | "triggerEvent">
) => {
  await tasker.create("sendWebhook", JSON.stringify({ secretKey, triggerEvent, createdAt, webhook, data }));
};

export default schedulePayload;
