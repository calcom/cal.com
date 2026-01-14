import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { nanoid } from "nanoid";

import type { PlatformOrganizationBillingTaskService } from "./PlatformOrganizationBillingTaskService";
import type { IPlatformOrganizationBillingTasker } from "./types";

export interface IPlatformOrganizationBillingSyncTaskerDependencies {
  billingTaskService: PlatformOrganizationBillingTaskService;
}

export class PlatformOrganizationBillingSyncTasker implements IPlatformOrganizationBillingTasker {
  constructor(
    public readonly dependencies: ITaskerDependencies & IPlatformOrganizationBillingSyncTaskerDependencies
  ) {}

  async incrementUsage(
    _payload: Parameters<IPlatformOrganizationBillingTasker["incrementUsage"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    console.log("Delayed task are not supported in sync mode, so we're just returning a runId", runId);
    return { runId };
  }

  async cancelUsageIncrement(
    _payload: Parameters<IPlatformOrganizationBillingTasker["cancelUsageIncrement"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    console.log("Delayed task are not supported in sync mode, so we're just returning a runId", runId);
    return { runId };
  }

  async rescheduleUsageIncrement(
    _payload: Parameters<IPlatformOrganizationBillingTasker["rescheduleUsageIncrement"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    console.log("Delayed task are not supported in sync mode, so we're just returning a runId", runId);
    return { runId };
  }
}
