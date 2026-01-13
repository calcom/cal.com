import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";

import type { PlatformOrganizationBillingSyncTasker } from "./PlatformOrganizationBillingSyncTasker";
import type { PlatformOrganizationBillingTriggerTasker } from "./PlatformOrganizationBillingTriggerTasker";
import type { IPlatformOrganizationBillingTasker, PlatformOrganizationBillingTaskPayload } from "./types";

export interface IPlatformOrganizationBillingTaskerDependencies {
  asyncTasker: PlatformOrganizationBillingTriggerTasker;
  syncTasker: PlatformOrganizationBillingSyncTasker;
  logger: ILogger;
}

export class PlatformOrganizationBillingTasker extends Tasker<IPlatformOrganizationBillingTasker> {
  constructor(public readonly dependencies: IPlatformOrganizationBillingTaskerDependencies) {
    super(dependencies);
  }

  public async incrementUsage(data: {
    payload: PlatformOrganizationBillingTaskPayload;
  }): Promise<{ runId: string }> {
    const { payload } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("incrementUsage", payload);

      this.logger.info(`PlatformOrganizationBillingTasker incrementUsage success:`, taskResponse, {
        userId: payload.userId,
      });
    } catch {
      taskResponse = { runId: "task-failed" };
      this.logger.error(`PlatformOrganizationBillingTasker incrementUsage failed`, taskResponse, {
        userId: payload.userId,
      });
    }

    return taskResponse;
  }
}
