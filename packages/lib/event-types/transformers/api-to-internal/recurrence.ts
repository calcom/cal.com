import { Frequency } from "@calcom/platform-enums/monorepo";
import {
  type CreateEventTypeInput_2024_06_14,
  type TransformRecurringEventSchema_2024_06_14,
} from "@calcom/platform-types";

export function transformRecurrenceApiToInternal(
  recurrence: CreateEventTypeInput_2024_06_14["recurrence"]
): TransformRecurringEventSchema_2024_06_14 | undefined {
  if (!recurrence) return undefined;
  return {
    interval: recurrence.interval,
    count: recurrence.occurrences,
    freq: Frequency[recurrence.frequency as keyof typeof Frequency],
  } satisfies TransformRecurringEventSchema_2024_06_14;
}
