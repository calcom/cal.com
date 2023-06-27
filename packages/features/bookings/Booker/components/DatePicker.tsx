import { useRouter } from "next/router";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { default as DatePickerComponent } from "@calcom/features/calendars/DatePicker";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules";
import { weekdayToWeekIndex } from "@calcom/lib/date-fns";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useRouterQuery from "@calcom/web/lib/hooks/useRouterQuery";

import { useEvent, useScheduleForEvent } from "../utils/event";
import { replaceQueryParams, updateQueryParam } from "../utils/query-param";

interface Props {
  syncChange?: boolean;
}

export const DatePicker = ({ syncChange }: Props) => {
  const router = useRouter();
  const { i18n } = useLocale();
  const { date: selectedDate } = useRouterQuery("date");
  const { month = dayjs().format("YYYY-MM") } = useRouterQuery("month");
  // const month = selectedDate ? dayjs(selectedDate, "YYYY-MM-DD").startOf("month") : dayjs();
  const event = useEvent();
  const schedule = useScheduleForEvent();
  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots);

  return (
    <DatePickerComponent
      isLoading={schedule.isLoading}
      onChange={(date: Dayjs) => {
        if (syncChange) {
          return updateQueryParam("date", date.format("YYYY-MM-DD"));
        }
        return replaceQueryParams("date", date.format("YYYY-MM-DD"));
      }}
      onMonthChange={(date: Dayjs) => {
        if (typeof window === undefined) return;
        const url = new URL(window.location.href);
        url.searchParams.set("month", date.format("YYYY-MM"));
        if (syncChange) {
          if (date.isSame(dayjs(), "month")) {
            url.searchParams.set("date", dayjs().format("YYYY-MM-DD"));
          } else {
            url.searchParams.set("date", date.format("YYYY-MM-DD"));
          }
        } else {
          url.searchParams.delete("date");
        }
        router.push(url, url, { shallow: true });
      }}
      includedDates={nonEmptyScheduleDays}
      locale={i18n.language}
      browsingDate={selectedDate ? dayjs(selectedDate, "YYYY-MM-DD") : dayjs(month, "YYYY-MM")}
      selected={dayjs(selectedDate, "YYYY-MM-DD")}
      weekStart={weekdayToWeekIndex(event?.data?.users?.[0]?.weekStart)}
    />
  );
};
