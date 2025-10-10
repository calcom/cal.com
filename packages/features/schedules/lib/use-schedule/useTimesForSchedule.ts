import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { BookerState } from "@calcom/features/bookings/Booker/types";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import type { UseScheduleWithCacheArgs } from "./useSchedule";

type UseTimesForScheduleProps = Pick<
  UseScheduleWithCacheArgs,
  "month" | "dayCount" | "selectedDate" | "bookerLayout"
>;

interface UsePrefetchParams {
  date: string;
  month: string | null;
  bookerLayout?: {
    layout: string;
    extraDays: number;
    columnViewExtraDays: { current: number };
  };
  bookerState: BookerState;
}

const usePrefetch = ({ date, month, bookerLayout, bookerState }: UsePrefetchParams) => {
  if (!bookerLayout) {
    return null;
  }
  const dateMonth = dayjs(date).month();
  const monthAfter1MonthFromDate = dayjs(date).add(1, "month").month();
  const monthAfterExtraDaysFromDate = dayjs(date).add(bookerLayout.extraDays, "day").month();
  const monthAfterColumnViewExtraDaysFromDate = dayjs(date)
    .add(bookerLayout.columnViewExtraDays.current, "day")
    .month();

  const isValidDate = dayjs(date).isValid();
  const twoWeeksAfter = dayjs(month).startOf("month").add(2, "week");
  const isSameMonth = dayjs().isSame(dayjs(month), "month");
  const isAfter2Weeks = dayjs().isAfter(twoWeeksAfter);

  const pretchFutureMonths =
    (bookerLayout.layout === BookerLayouts.WEEK_VIEW &&
      !!bookerLayout.extraDays &&
      !isNaN(dateMonth) &&
      !isNaN(monthAfterExtraDaysFromDate) &&
      dateMonth !== monthAfterExtraDaysFromDate) ||
    (bookerLayout.layout === BookerLayouts.COLUMN_VIEW &&
      !isNaN(dateMonth) &&
      !isNaN(monthAfterColumnViewExtraDaysFromDate) &&
      dateMonth !== monthAfterColumnViewExtraDaysFromDate) ||
    ((bookerLayout.layout === BookerLayouts.MONTH_VIEW || bookerLayout.layout === "mobile") &&
      (!isValidDate || isSameMonth) &&
      isAfter2Weeks);

  if (!pretchFutureMonths) {
    return null;
  }

  // FIXME: There is an issue with this logic
  // If monthAfter1MonthFromDate = 5 and monthAfterColumnViewExtraDaysFromDate = 4, it will prefetch 2 months that is in total 3 months. In such a situation infact we just need to prefetch just one month and thus total of 2 months.
  // So, we should make it something like monthAfterColumnViewExtraDaysFromDate > monthAfter1MonthFromDate, but this condition considering that extra days remains a few days only, won't be practically true and thus it looks like we really don't need this condition at all
  // Practically, this conditon doesn't frequently arise because it needs to have date query param set. So, to be able to replicate this issue, one needs to select a date and then refresh the page
  // Fix it in a follow up PR - There is a failing test that is skipped because of this issue
  const doesExtraDaysNeedOneMoreMonth =
    !isNaN(monthAfter1MonthFromDate) &&
    !isNaN(monthAfterColumnViewExtraDaysFromDate) &&
    // monthAfterColumnViewExtraDaysFromDate > monthAfter1MonthFromDate &&
    monthAfterColumnViewExtraDaysFromDate != monthAfter1MonthFromDate;

  // TODO: We need to refactor the approach to prefetch and prefetching must be done as a second non-blocking request instead of fetching all data together
  const monthsToPrefetch: 1 | 2 =
    // Don't know why we need to specifically prevent prefetching for non-Week view layouts when booker state isn't selecting_time(e.g. loading)
    // This ends up causing different time ranges for different booker states and thus multiple getSchedule calls are made
    // Steps to replicate: Simply go to http://acme.cal.local:3000/owner1/30min?overlayCalendar=true&layout=month_view&month=2025-09&date=2025-09-24. Two calls will be made, first one that prefetches 1 month and second one that prefetches 2 months.
    ((bookerLayout.layout !== BookerLayouts.WEEK_VIEW && bookerState === "selecting_time") ||
      bookerLayout.layout === BookerLayouts.COLUMN_VIEW) &&
    doesExtraDaysNeedOneMoreMonth
      ? 2
      : 1;

  return { monthsToPrefetch };
};

export const useTimesForSchedule = ({
  month: monthFromProps,
  selectedDate,
  dayCount,
  bookerLayout,
}: UseTimesForScheduleProps): [string, string] => {
  const [monthFromStore, bookerState] = useBookerStoreContext((state) => [state.month, state.state], shallow);
  const month = monthFromStore ?? monthFromProps ?? null;
  const date = dayjs(selectedDate).format("YYYY-MM-DD");
  const prefetchData = usePrefetch({
    date,
    month,
    bookerLayout,
    bookerState,
  });

  const now = dayjs();
  const monthDayjs = month ? dayjs(month) : now;

  let startTime;
  let endTime;

  if (!!dayCount && dayCount > 0) {
    if (selectedDate) {
      startTime = dayjs(selectedDate).toISOString();
      endTime = dayjs(selectedDate).add(dayCount, "day").toISOString();
    } else if (monthDayjs.month() === now.month()) {
      startTime = now.startOf("day").toISOString();
      endTime = now.startOf("day").add(dayCount, "day").toISOString();
    } else {
      startTime = monthDayjs.startOf("month").toISOString();
      endTime = monthDayjs.startOf("month").add(dayCount, "day").toISOString();
    }
  } else {
    const monthsToPrefetch = prefetchData?.monthsToPrefetch;
    const lastMonthToPrefetchDayjs = monthsToPrefetch ? monthDayjs.add(monthsToPrefetch, "month") : null;
    startTime = monthDayjs.startOf("month").toISOString();
    endTime = (lastMonthToPrefetchDayjs ? lastMonthToPrefetchDayjs : monthDayjs).endOf("month").toISOString();
  }
  return [startTime, endTime];
};
