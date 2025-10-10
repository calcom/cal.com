import dayjs from "@calcom/dayjs";
import type { BookerState } from "@calcom/features/bookings/Booker/types";

import { getPrefetchMonthCount } from "../../utils/getPrefetchMonthCount";
import { isPrefetchNextMonthEnabled } from "../../utils/isPrefetchNextMonthEnabled";

interface UsePrefetchParams {
  date: string;
  month: string | null;
  bookerLayout: {
    layout: string;
    extraDays: number;
    columnViewExtraDays: { current: number };
  };
  bookerState: BookerState;
}

export const usePrefetch = ({ date, month, bookerLayout, bookerState }: UsePrefetchParams) => {
  const monthAfterAdding1Month = dayjs(date).add(1, "month").month();
  const monthAfterAddingExtraDaysColumnView = dayjs(date)
    .add(bookerLayout.columnViewExtraDays.current, "day")
    .month();

  const prefetchNextMonth = isPrefetchNextMonthEnabled(bookerLayout.layout, date, month);
  const monthCount = getPrefetchMonthCount(
    bookerLayout.layout,
    bookerState,
    monthAfterAdding1Month,
    monthAfterAddingExtraDaysColumnView
  );

  return {
    prefetchNextMonth,
    monthCount,
  };
};
