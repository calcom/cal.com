import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createTranslateEventTypeDataTask(
  payload: TaskPayloads["translateEventTypeData"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("translateEventTypeData", payload, options);
}
