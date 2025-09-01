import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createSendEmailTask(
  payload: TaskPayloads["sendEmail"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("sendEmail", payload, options);
}
