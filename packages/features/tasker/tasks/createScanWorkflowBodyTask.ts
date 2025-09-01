import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createScanWorkflowBodyTask(
  payload: TaskPayloads["scanWorkflowBody"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("scanWorkflowBody", payload, options);
}
