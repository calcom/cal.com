import type { TriggerOptions } from "@trigger.dev/sdk";
import type { z } from "zod";
import type { platformBillingTaskSchema } from "./trigger/schema";

type WithVoidReturns<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => unknown ? (...args: P) => void : T[K];
};

export type PlatformOrganizationBillingTaskPayload = z.infer<typeof platformBillingTaskSchema>;

export interface IPlatformOrganizationBillingTasker {
  incrementUsage(
    payload: PlatformOrganizationBillingTaskPayload,
    options?: TriggerOptions
  ): Promise<{ runId: string }>;

  cancelUsageIncrement(payload: { bookingUid: string }, options?: TriggerOptions): Promise<{ runId: string }>;

  rescheduleUsageIncrement(
    payload: {
      bookingUid: string;
      rescheduledTime: Date;
    },
    options?: TriggerOptions
  ): Promise<{ runId: string }>;
}

export type PlatformOrganizationBillingTasks = WithVoidReturns<
  Pick<IPlatformOrganizationBillingTasker, "incrementUsage">
>;
