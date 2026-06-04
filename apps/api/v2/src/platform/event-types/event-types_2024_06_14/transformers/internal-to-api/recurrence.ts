import { Frequency, FrequencyInput } from "@calcom/platform-enums";
import type { Recurrence_2024_06_14, TransformRecurringEventSchema_2024_06_14 } from "@calcom/platform-types";

export function transformRecurrenceInternalToApi(
  transformRecurringEvent: TransformRecurringEventSchema_2024_06_14
): Recurrence_2024_06_14 {
  return {
    interval: transformRecurringEvent.interval,
    occurrences: transformRecurringEvent.count,
    frequency: FrequencyInput[Frequency[transformRecurringEvent.freq] as keyof typeof FrequencyInput],
  } satisfies Recurrence_2024_06_14;
}
