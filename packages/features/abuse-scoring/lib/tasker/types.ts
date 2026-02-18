import type { TriggerOptions } from "@trigger.dev/sdk";
import type { z } from "zod";

import type { abuseScoringTaskSchema } from "./trigger/schema";

type WithVoidReturns<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => unknown ? (...args: P) => void : T[K];
};

export type AbuseScoringTaskPayload = z.infer<typeof abuseScoringTaskSchema>;

export interface IAbuseScoringTasker {
  analyzeUser(payload: AbuseScoringTaskPayload, options?: TriggerOptions): Promise<{ runId: string }>;
}

export type AbuseScoringTasks = WithVoidReturns<Pick<IAbuseScoringTasker, "analyzeUser">>;
