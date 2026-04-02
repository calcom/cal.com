import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { CRMTaskPayload, ICRMTasker } from "./types";

function buildTags(payload: CRMTaskPayload): string[] {
  const tags: string[] = [];

  if (payload.bookingUid != null) {
    tags.push(`booking:${payload.bookingUid}`);
  }

  return tags;
}

export class CRMTriggerTasker implements ICRMTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async createEvent(payload: CRMTaskPayload): Promise<{ runId: string }> {
    const { createCRMEventTask } = await import("./trigger/create-crm-event");
    const tags = buildTags(payload);
    const handle = await createCRMEventTask.trigger(payload, { tags });
    return { runId: handle.id };
  }
}
