import type { z } from "zod";
import type { createCRMEventTaskSchema } from "./trigger/schema";

type WithVoidReturns<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => unknown ? (...args: P) => void : T[K];
};

export type CRMTaskPayload = z.infer<typeof createCRMEventTaskSchema>;

export interface ICRMTasker {
  createEvent(payload: CRMTaskPayload): Promise<{ runId: string }>;
}

export type CRMTasks = WithVoidReturns<Pick<ICRMTasker, "createEvent">>;
