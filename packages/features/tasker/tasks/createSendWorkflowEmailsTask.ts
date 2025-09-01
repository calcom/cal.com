import { Task } from "../repository";
import type { TaskPayloads } from "../tasker";

export async function createSendWorkflowEmailsTask(
  payload: TaskPayloads["sendWorkflowEmails"],
  options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
): Promise<string> {
  return Task.create("sendWorkflowEmails", payload, options);
}
