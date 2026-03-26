import type { TriggerOptions } from "@trigger.dev/sdk";
import type { z } from "zod";
import type { calendarsTaskSchema } from "./trigger/schema";

type WithVoidReturns<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => unknown ? (...args: P) => void : T[K];
};

export type CalendarsTaskPayload = z.infer<typeof calendarsTaskSchema>;

export interface ICalendarsTasker {
  ensureDefaultCalendars(payload: CalendarsTaskPayload, options?: TriggerOptions): Promise<{ runId: string }>;
}

export type CalendarsTasks = WithVoidReturns<Pick<ICalendarsTasker, "ensureDefaultCalendars">>;
