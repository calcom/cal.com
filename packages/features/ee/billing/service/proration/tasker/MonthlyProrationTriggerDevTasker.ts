import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { IMonthlyProrationTasker } from "./types";

export class MonthlyProrationTriggerDevTasker
  implements IMonthlyProrationTasker
{
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async processBatch(
    payload: Parameters<IMonthlyProrationTasker["processBatch"]>[0]
  ) {
    const { processMonthlyProrationProcess: processMonthlyProrationBatch } =
      await import("./trigger/processMonthlyProration");
    const handle = await processMonthlyProrationBatch.trigger(payload);
    return { runId: handle.id };
  }
}
