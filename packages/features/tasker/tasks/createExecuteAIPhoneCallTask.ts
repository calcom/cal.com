import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createExecuteAIPhoneCallTask(
  payload: TaskPayloads["executeAIPhoneCall"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("executeAIPhoneCall", payload, options);
}
