import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import type { CRMSyncTasker } from "./crm-sync-tasker";
import type { CRMTriggerTasker } from "./crm-trigger-tasker";
import type { CRMTaskPayload, ICRMTasker } from "./types";

export interface ICRMTaskerDependencies {
  asyncTasker: CRMTriggerTasker;
  syncTasker: CRMSyncTasker;
  logger: ILogger;
}

export class CRMTasker extends Tasker<ICRMTasker> {
  constructor(public readonly dependencies: ICRMTaskerDependencies) {
    super(dependencies);
  }

  public async createEvent(data: { payload: CRMTaskPayload }): Promise<{ runId: string }> {
    const { payload } = data;
    let taskResponse: { runId: string } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("createEvent", payload);

      this.logger.info("CRMTasker createEvent success:", taskResponse, {
        bookingUid: payload.bookingUid,
      });
    } catch {
      taskResponse = { runId: "task-failed" };
      this.logger.error("CRMTasker createEvent failed", taskResponse, {
        bookingUid: payload.bookingUid,
      });
    }

    return taskResponse;
  }
}
