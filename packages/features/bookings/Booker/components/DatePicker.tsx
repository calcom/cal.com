import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { default as DatePickerComponent } from "@calcom/features/calendars/DatePicker";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import { weekdayToWeekIndex } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useEvent, useScheduleForEvent } from "../utils/event";
import { useBookerNavigation } from "../utils/navigation";

interface Props {
  syncChange?: boolean;
}

export const DatePicker = ({ syncChange }: Props) => {
  const { i18n } = useLocale();
  const {
    date: selectedDate,
    month = dayjs().format("YYYY-MM"),
    updateQuery,
    replaceQuery,
  } = useBookerNavigation();
  const event = useEvent();
  const schedule = useScheduleForEvent();
  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots);

  return (
    <DatePickerComponent
      isLoading={schedule.isLoading}
      onChange={(date: Dayjs) => {
        if (syncChange) {
          return updateQuery({ date: date.format("YYYY-MM-DD") });
        }
        return replaceQuery({ date: date.format("YYYY-MM-DD") });
      }}
      onMonthChange={(date: Dayjs) => {
        const newQuery: Record<string, string> = {
          month: date.format("YYYY-MM"),
          date: "",
        };
        if (syncChange) {
          const sameMonth = date.isSame(dayjs(), "month");
          newQuery.date = sameMonth ? dayjs().format("YYYY-MM-DD") : date.format("YYYY-MM-DD");
        }

        updateQuery(newQuery);
      }}
      includedDates={nonEmptyScheduleDays}
      locale={i18n.language}
      browsingDate={selectedDate ? dayjs(selectedDate, "YYYY-MM-DD") : dayjs(month, "YYYY-MM")}
      selected={dayjs(selectedDate, "YYYY-MM-DD")}
      weekStart={weekdayToWeekIndex(event?.data?.users?.[0]?.weekStart)}
    />
  );
};
