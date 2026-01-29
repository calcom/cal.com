import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { IWorkflowTasker } from "./types";

export class WorkflowTriggerDevTasker implements IWorkflowTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async scheduleRescheduleWorkflows(payload: Parameters<IWorkflowTasker["scheduleRescheduleWorkflows"]>[0]) {
    const { scheduleRescheduleWorkflows } = await import("./trigger/scheduleRescheduleWorkflows");
    const handle = await scheduleRescheduleWorkflows.trigger(payload);
    return { runId: handle.id };
  }
}
