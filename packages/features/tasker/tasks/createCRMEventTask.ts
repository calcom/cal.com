import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createCRMEventTask(
  payload: TaskPayloads["createCRMEvent"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("createCRMEvent", payload, options);
}
