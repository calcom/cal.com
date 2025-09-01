import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createSendSmsTask(
  payload: TaskPayloads["sendSms"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("sendSms", payload, options);
}
