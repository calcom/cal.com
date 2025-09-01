import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createSendAnalyticsEventTask(
  payload: TaskPayloads["sendAnalyticsEvent"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("sendAnalyticsEvent", payload, options);
}
