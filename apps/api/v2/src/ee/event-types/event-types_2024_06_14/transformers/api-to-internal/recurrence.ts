import { Frequency } from "@calcom/platform-enums";
import type { Recurrence_2024_06_14 } from "@calcom/platform-types";
import { type TransformRecurringEventSchema_2024_06_14 } from "@calcom/platform-types";

export function transformRecurrenceApiToInternal(
  recurrence: Recurrence_2024_06_14
): TransformRecurringEventSchema_2024_06_14 {
  return {
    interval: recurrence.interval,
    count: recurrence.occurrences,
    freq: Frequency[recurrence.frequency as keyof typeof Frequency],
  } satisfies TransformRecurringEventSchema_2024_06_14;
}
