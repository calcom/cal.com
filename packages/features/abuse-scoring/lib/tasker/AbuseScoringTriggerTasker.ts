import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { TriggerOptions } from "@trigger.dev/sdk";

import type { IAbuseScoringTasker } from "./types";

export class AbuseScoringTriggerTasker implements IAbuseScoringTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async analyzeUser(
    payload: Parameters<IAbuseScoringTasker["analyzeUser"]>[0],
    options?: TriggerOptions
  ): Promise<{ runId: string }> {
    const { analyzeUser } = await import("./trigger/analyze-user");
    const handle = await analyzeUser.trigger(payload, options);
    return { runId: handle.id };
  }
}
