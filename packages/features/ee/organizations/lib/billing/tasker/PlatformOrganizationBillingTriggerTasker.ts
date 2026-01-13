import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { IPlatformOrganizationBillingTasker } from "./types";

export class PlatformOrganizationBillingTriggerTasker implements IPlatformOrganizationBillingTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async incrementUsage(payload: Parameters<IPlatformOrganizationBillingTasker["incrementUsage"]>[0]) {
    const { incrementUsage } = await import("./trigger/increment-usage");
    const handle = await incrementUsage.trigger(payload);
    return { runId: handle.id };
  }
}
