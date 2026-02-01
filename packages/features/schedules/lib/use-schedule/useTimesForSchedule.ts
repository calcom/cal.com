import { useRef } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { BookerState } from "@calcom/features/bookings/Booker/types";
import { getPrefetchMonthCount } from "@calcom/features/bookings/Booker/utils/getPrefetchMonthCount";
import { isPrefetchNextMonthEnabled } from "@calcom/features/bookings/Booker/utils/isPrefetchNextMonthEnabled";

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
  const monthAfterAdding1Month = dayjs(date).add(1, "month").month();
  const monthAfterAddingExtraDays = dayjs(date).add(bookerLayout.extraDays, "day").month();
  const monthAfterAddingExtraDaysColumnView = dayjs(date)
    .add(bookerLayout.columnViewExtraDays.current, "day")
    .month();

  const prefetchNextMonth = isPrefetchNextMonthEnabled(
    bookerLayout.layout,
    date,
    dateMonth,
    monthAfterAddingExtraDays,
    monthAfterAddingExtraDaysColumnView,
    month,
    bookerLayout.extraDays
  );

  if (!prefetchNextMonth) {
    return null;
  }

  const monthCount = getPrefetchMonthCount(
    bookerLayout.layout,
    bookerState,
    monthAfterAdding1Month,
    monthAfterAddingExtraDaysColumnView,
    prefetchNextMonth
  );

  return { monthsToPrefetch: monthCount ?? 1 };
};

type UseTimesForScheduleReturn = {
  startTime: string;
  endTime: string;
  overlapsWithPreviousRange: boolean;
};

export const useTimesForSchedule = ({
  month: monthFromProps,
  selectedDate,
  dayCount,
  bookerLayout,
}: UseTimesForScheduleProps): UseTimesForScheduleReturn => {
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

  // If the new range is already covered by the previous query range, reuse it to avoid
  // a redundant API call. This happens when e.g. the month auto-advances from January to
  // February but the first query already prefetched Jan→Mar.
  const previousRangeRef = useRef<{ startTime: string; endTime: string } | null>(null);
  let overlapsWithPreviousRange = false;

  if (previousRangeRef.current) {
    const prev = previousRangeRef.current;
    const isFullyCovered = startTime >= prev.startTime && endTime <= prev.endTime;
    if (isFullyCovered) {
      return { ...prev, overlapsWithPreviousRange: false };
    }

    // Partial overlap: new range extends beyond the previous but shares some coverage.
    // The query key will change, so signal the consumer to use keepPreviousData to avoid
    // a skeleton flash while the wider range loads.
    const hasOverlap = startTime < prev.endTime && endTime > prev.startTime;
    overlapsWithPreviousRange = hasOverlap;
  }
  previousRangeRef.current = { startTime, endTime };

  return { startTime, endTime, overlapsWithPreviousRange };
};
