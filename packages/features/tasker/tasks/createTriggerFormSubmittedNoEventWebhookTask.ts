import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createTriggerFormSubmittedNoEventWebhookTask(
  payload: TaskPayloads["triggerFormSubmittedNoEventWebhook"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("triggerFormSubmittedNoEventWebhook", payload, options);
}
