import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createTriggerHostNoShowWebhookTask(
  payload: TaskPayloads["triggerHostNoShowWebhook"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("triggerHostNoShowWebhook", payload, options);
}
