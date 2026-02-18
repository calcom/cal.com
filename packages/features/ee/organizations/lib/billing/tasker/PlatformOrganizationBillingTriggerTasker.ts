import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { TriggerOptions } from "@trigger.dev/sdk";
import type { IPlatformOrganizationBillingTasker } from "./types";

export class PlatformOrganizationBillingTriggerTasker implements IPlatformOrganizationBillingTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async incrementUsage(
    payload: Parameters<IPlatformOrganizationBillingTasker["incrementUsage"]>[0],
    options?: TriggerOptions
  ): Promise<{ runId: string }> {
    const { incrementUsage } = await import("./trigger/increment-usage");
    const handle = await incrementUsage.trigger(payload, options);
    return { runId: handle.id };
  }

  async cancelUsageIncrement(
    payload: Parameters<IPlatformOrganizationBillingTasker["cancelUsageIncrement"]>[0],
    options?: TriggerOptions
  ): Promise<{ runId: string }> {
    const { cancelUsageIncrement } = await import("./trigger/cancel-usage-increment");
    const handle = await cancelUsageIncrement.trigger(payload, options);
    return { runId: handle.id };
  }

  async rescheduleUsageIncrement(
    payload: Parameters<IPlatformOrganizationBillingTasker["rescheduleUsageIncrement"]>[0],
    options?: TriggerOptions
  ): Promise<{ runId: string }> {
    const { rescheduleUsageIncrement } = await import("./trigger/reschedule-usage-increment");
    const handle = await rescheduleUsageIncrement.trigger(payload, options);
    return { runId: handle.id };
  }
}
