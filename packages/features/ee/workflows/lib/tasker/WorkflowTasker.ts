import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";

import type { IWorkflowTasker, WorkflowTaskPayload } from "./types";
import type { WorkflowSyncTasker } from "./WorkflowSyncTasker";
import type { WorkflowTriggerDevTasker } from "./WorkflowTriggerDevTasker";

export interface IWorkflowTaskerDependencies {
  asyncTasker: WorkflowTriggerDevTasker;
  syncTasker: WorkflowSyncTasker;
  logger: ILogger;
}

export class WorkflowTasker extends Tasker<IWorkflowTasker> {
  constructor(public readonly dependencies: IWorkflowTaskerDependencies) {
    super(dependencies);
  }

  public async scheduleRescheduleWorkflows(payload: WorkflowTaskPayload): Promise<{ runId: string }> {
    let taskResponse: { runId: string } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("scheduleRescheduleWorkflows", payload);

      this.logger.info(`WorkflowTasker scheduleRescheduleWorkflows success:`, taskResponse, {
        bookingId: payload.bookingId,
      });
    } catch {
      taskResponse = { runId: "task-failed" };
      this.logger.error(`WorkflowTasker scheduleRescheduleWorkflows failed`, taskResponse, {
        bookingId: payload.bookingId,
      });
    }

    return taskResponse;
  }
}
