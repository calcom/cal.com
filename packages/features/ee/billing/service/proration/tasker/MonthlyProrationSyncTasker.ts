import { nanoid } from "nanoid";
import type { Logger } from "tslog";

import { MonthlyProrationService } from "../MonthlyProrationService";
import type { IMonthlyProrationTasker } from "./types";

export class MonthlyProrationSyncTasker implements IMonthlyProrationTasker {
  constructor(private readonly logger: Logger<unknown>) {}

  async processBatch(payload: Parameters<IMonthlyProrationTasker["processBatch"]>[0]) {
    const runId = `sync_${nanoid(10)}`;
    const prorationService = new MonthlyProrationService(this.logger);
    await prorationService.processMonthlyProrations(payload);
    return { runId };
  }
}
