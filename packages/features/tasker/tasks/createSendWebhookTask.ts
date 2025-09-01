import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createSendWebhookTask(
  payload: TaskPayloads["sendWebhook"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("sendWebhook", payload, options);
}
