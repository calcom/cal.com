import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { ILogger } from "@calcom/lib/tasker/types";
import type { TriggerOptions } from "@trigger.dev/sdk";

import type { AbuseScoringSyncTasker } from "./AbuseScoringSyncTasker";
import type { AbuseScoringTriggerTasker } from "./AbuseScoringTriggerTasker";
import type { AbuseScoringTaskPayload, IAbuseScoringTasker } from "./types";

export interface IAbuseScoringTaskerDependencies {
  asyncTasker: AbuseScoringTriggerTasker;
  syncTasker: AbuseScoringSyncTasker;
  logger: ILogger;
}

export class AbuseScoringTasker extends Tasker<IAbuseScoringTasker> {
  constructor(public readonly dependencies: IAbuseScoringTaskerDependencies) {
    super(dependencies);
  }

  public async analyzeUser(data: {
    payload: AbuseScoringTaskPayload;
    options?: TriggerOptions;
  }): Promise<{ runId: string }> {
    const { payload } = data;
    let taskResponse: { runId: string } = { runId: "task-not-found" };

    try {
      taskResponse = await this.dispatch("analyzeUser", payload, data.options);

      this.logger.info("AbuseScoringTasker analyzeUser success:", taskResponse, {
        userId: payload.userId,
      });
    } catch {
      taskResponse = { runId: "task-failed" };
      this.logger.error("AbuseScoringTasker analyzeUser failed", taskResponse, {
        userId: payload.userId,
      });
    }

    return taskResponse;
  }
}
