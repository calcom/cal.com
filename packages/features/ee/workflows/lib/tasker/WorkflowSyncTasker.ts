import { nanoid } from "nanoid";

import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { IWorkflowTasker } from "./types";
import type { WorkflowTaskService } from "./WorkflowTaskService";

export interface IWorkflowSyncTaskerDependencies {
  workflowTaskService: WorkflowTaskService;
}

export class WorkflowSyncTasker implements IWorkflowTasker {
  constructor(public readonly dependencies: ITaskerDependencies & IWorkflowSyncTaskerDependencies) {}

  async scheduleRescheduleWorkflows(payload: Parameters<IWorkflowTasker["scheduleRescheduleWorkflows"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.workflowTaskService.scheduleRescheduleWorkflows(payload);
    return { runId };
  }
}
