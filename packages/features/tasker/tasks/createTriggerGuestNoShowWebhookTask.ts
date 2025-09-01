import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createTriggerGuestNoShowWebhookTask(
  payload: TaskPayloads["triggerGuestNoShowWebhook"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("triggerGuestNoShowWebhook", payload, options);
}
