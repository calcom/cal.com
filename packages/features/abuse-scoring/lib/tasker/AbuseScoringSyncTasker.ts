import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import { nanoid } from "nanoid";

import type { AbuseScoringTaskService } from "./AbuseScoringTaskService";
import type { IAbuseScoringTasker } from "./types";

export interface IAbuseScoringSyncTaskerDependencies {
  abuseScoringTaskService: AbuseScoringTaskService;
}

export class AbuseScoringSyncTasker implements IAbuseScoringTasker {
  constructor(public readonly dependencies: ITaskerDependencies & IAbuseScoringSyncTaskerDependencies) {}

  async analyzeUser(
    payload: Parameters<IAbuseScoringTasker["analyzeUser"]>[0]
  ): Promise<{ runId: string }> {
    const runId = `sync_${nanoid(10)}`;
    await this.dependencies.abuseScoringTaskService.analyzeUser(payload);
    return { runId };
  }
}
