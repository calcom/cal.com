import { recurringEventType as recurringEventSchema } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";

export function isRecurringEvent(obj: unknown): obj is RecurringEvent {
  const parsedRecuEvt = recurringEventSchema.safeParse(obj);
  return parsedRecuEvt.success;
}

export function parseRecurringEvent(obj: unknown): RecurringEvent | null {
  let recurringEvent: RecurringEvent | null = null;
  if (isRecurringEvent(obj)) recurringEvent = obj;
  return recurringEvent;
}
