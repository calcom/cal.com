import { nanoid } from "nanoid";

import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { PlatformOrganizationBillingTaskService } from "./PlatformOrganizationBillingTaskService";
import type { IPlatformOrganizationBillingTasker } from "./types";

export interface IPlatformOrganizationBillingSyncTaskerDependencies {
  billingTaskService: PlatformOrganizationBillingTaskService;
}

export class PlatformOrganizationBillingSyncTasker implements IPlatformOrganizationBillingTasker {
  constructor(
    public readonly dependencies: ITaskerDependencies & IPlatformOrganizationBillingSyncTaskerDependencies
  ) {}

  async incrementUsage(payload: Parameters<IPlatformOrganizationBillingTasker["incrementUsage"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.billingTaskService.incrementUsage(payload);
    return { runId };
  }
}
