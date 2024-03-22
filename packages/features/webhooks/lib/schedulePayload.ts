import type { Webhook } from "@prisma/client";

import { TaskerFactory } from "@calcom/features/tasker/tasker-factory";

import type { WebhookDataType } from "./sendPayload";

const schedulePayload = async (
  secretKey: string | null,
  triggerEvent: string,
  createdAt: string,
  webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">,
  data: Omit<WebhookDataType, "createdAt" | "triggerEvent">
) => {
  const taskerFactory = new TaskerFactory();
  const tasker = taskerFactory.createTasker();
  await tasker.create("sendWebhook", JSON.stringify({ secretKey, triggerEvent, createdAt, webhook, data }));
};

export default schedulePayload;
