import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { AbuseScoringService } from "../../services/AbuseScoringService";
import type { AbuseScoringTasks } from "./types";

export interface IAbuseScoringTaskServiceDependencies {
  abuseScoringService: AbuseScoringService;
}

export class AbuseScoringTaskService implements AbuseScoringTasks {
  constructor(
    public readonly dependencies: {
      logger: ITaskerDependencies["logger"];
    } & IAbuseScoringTaskServiceDependencies
  ) {}

  async analyzeUser(payload: Parameters<AbuseScoringTasks["analyzeUser"]>[0]): Promise<void> {
    const { userId, reason } = payload;
    const { abuseScoringService, logger } = this.dependencies;

    try {
      await abuseScoringService.analyzeUser(userId, reason);
      logger.info("AbuseScoringTaskService analyzeUser completed", { userId, reason });
    } catch (err) {
      logger.error("AbuseScoringTaskService analyzeUser failed", {
        userId,
        reason,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
}
