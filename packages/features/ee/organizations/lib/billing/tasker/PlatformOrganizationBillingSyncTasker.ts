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
    payload: Parameters<IPlatformOrganizationBillingTasker["incrementUsage"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    this.dependencies.logger.info(
      "Delayed tasks are not supported in sync mode, did not increment usage",
      runId,
      payload
    );
    return { runId };
  }

  async cancelUsageIncrement(
    payload: Parameters<IPlatformOrganizationBillingTasker["cancelUsageIncrement"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    this.dependencies.logger.info(
      "Delayed tasks are not supported in sync mode, did not cancel usage increment",
      runId,
      payload
    );
    return { runId };
  }

  async rescheduleUsageIncrement(
    payload: Parameters<IPlatformOrganizationBillingTasker["rescheduleUsageIncrement"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    this.dependencies.logger.info(
      "Delayed tasks are not supported in sync mode, did not reschedule usage increment",
      runId,
      payload
    );
    return { runId };
  }

  async countActiveManagedUsers(
    payload: Parameters<IPlatformOrganizationBillingTasker["countActiveManagedUsers"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.billingTaskService.countActiveManagedUsers(payload);
    this.dependencies.logger.info("Counted active managed users in sync mode", runId, payload);
    return { runId };
  }

  async invoiceActiveManagedUsers(
    payload: Parameters<IPlatformOrganizationBillingTasker["invoiceActiveManagedUsers"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.billingTaskService.invoiceActiveManagedUsers(payload);
    this.dependencies.logger.info("Invoiced active managed users in sync mode", runId);
    return { runId };
  }
}
