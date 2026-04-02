import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { Logger } from "tslog";
import type { MonthlyProrationSyncTasker } from "./MonthlyProrationSyncTasker";
import type { MonthlyProrationTriggerDevTasker } from "./MonthlyProrationTriggerDevTasker";
import type { IMonthlyProrationTasker, MonthlyProrationBatchPayload } from "./types";

export interface MonthlyProrationTaskerDependencies {
  asyncTasker: MonthlyProrationTriggerDevTasker;
  syncTasker: MonthlyProrationSyncTasker;
  logger: Logger<unknown>;
}

export class MonthlyProrationTasker extends Tasker<IMonthlyProrationTasker> {
  constructor(dependencies: MonthlyProrationTaskerDependencies) {
    super(dependencies);
  }

  async processBatch(payload: MonthlyProrationBatchPayload): Promise<{ runId: string }> {
    return await this.dispatch("processBatch", payload);
  }
}
