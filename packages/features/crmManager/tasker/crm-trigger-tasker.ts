import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { CRMTaskPayload, ICRMTasker } from "./types";

export class CRMTriggerTasker implements ICRMTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async createEvent(payload: CRMTaskPayload): Promise<{ runId: string }> {
    const { createCRMEventTask } = await import("./trigger/create-crm-event");
    const handle = await createCRMEventTask.trigger(payload);
    return { runId: handle.id };
  }
}
