import type { z } from "zod";

import type { platformBillingTaskSchema } from "./trigger/schema";

export type PlatformOrganizationBillingTaskPayload = z.infer<typeof platformBillingTaskSchema>;

export interface IPlatformOrganizationBillingTasker {
  incrementUsage(payload: PlatformOrganizationBillingTaskPayload): Promise<{ runId: string }>;
}

type WithVoidReturns<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => unknown ? (...args: P) => void : T[K];
};

export type PlatformOrganizationBillingTasks = WithVoidReturns<IPlatformOrganizationBillingTasker>;
