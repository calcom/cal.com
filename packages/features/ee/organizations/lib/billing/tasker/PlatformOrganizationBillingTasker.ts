import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import type { TriggerOptions } from "@trigger.dev/sdk";
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
    options?: TriggerOptions;
  }): Promise<{ runId: string }> {
    const { payload, options } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("incrementUsage", payload, options);

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

  public async cancelUsageIncrement(data: {
    payload: { bookingUid: string };
    options?: TriggerOptions;
  }): Promise<{ runId: string }> {
    const { payload, options } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("cancelUsageIncrement", payload, options);

      this.logger.info(`PlatformOrganizationBillingTasker cancelUsageIncrement success:`, taskResponse, {
        bookingUid: payload.bookingUid,
      });
    } catch {
      taskResponse = { runId: "task-failed" };
      this.logger.error(`PlatformOrganizationBillingTasker cancelUsageIncrement failed`, taskResponse, {
        bookingUid: payload.bookingUid,
      });
    }

    return taskResponse;
  }

  public async rescheduleUsageIncrement(data: {
    payload: { bookingUid: string; rescheduledTime: Date };
    options?: TriggerOptions;
  }): Promise<{ runId: string }> {
    const { payload, options } = data;
    let taskResponse: {
      runId: string;
    } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("rescheduleUsageIncrement", payload, options);
      this.logger.info(`PlatformOrganizationBillingTasker rescheduleUsageIncrement success:`, taskResponse, {
        bookingUid: payload.bookingUid,
      });
    } catch {
      taskResponse = { runId: "task-failed" };
      this.logger.error(`PlatformOrganizationBillingTasker rescheduleUsageIncrement failed`, taskResponse, {
        bookingUid: payload.bookingUid,
      });
    }

    return taskResponse;
  }
}
