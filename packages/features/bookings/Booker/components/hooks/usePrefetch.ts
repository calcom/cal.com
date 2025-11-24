import dayjs from "@calcom/dayjs";
import type { BookerState } from "@calcom/features/bookings/Booker/types";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

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
  const dateMonth = dayjs(date).month();
  const monthAfterAdding1Month = dayjs(date).add(1, "month").month();
  const monthAfterAddingExtraDays = dayjs(date).add(bookerLayout.extraDays, "day").month();

  // Add extra week buffer for column view to handle weekends/unavailable days
  const columnViewExtraDays =
    bookerLayout.layout === BookerLayouts.COLUMN_VIEW
      ? Math.max(bookerLayout.columnViewExtraDays.current, bookerLayout.extraDays + 7)
      : bookerLayout.columnViewExtraDays.current;

  const monthAfterAddingExtraDaysColumnView = dayjs(date).add(columnViewExtraDays, "day").month();

  const prefetchNextMonth = isPrefetchNextMonthEnabled(
    bookerLayout.layout,
    date,
    dateMonth,
    monthAfterAddingExtraDays,
    monthAfterAddingExtraDaysColumnView,
    month,
    bookerLayout.extraDays
  );
  const monthCount = getPrefetchMonthCount(
    bookerLayout.layout,
    bookerState,
    monthAfterAdding1Month,
    monthAfterAddingExtraDaysColumnView,
    prefetchNextMonth
  );

  return {
    prefetchNextMonth,
    monthCount,
  };
};
