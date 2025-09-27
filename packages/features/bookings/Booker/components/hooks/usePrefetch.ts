import dayjs from "@calcom/dayjs";
import type { BookerState } from "@calcom/features/bookings/Booker/types";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { getPrefetchMonthCount } from "../../utils/getPrefetchMonthCount";

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
  const monthAfterAddingExtraDaysColumnView = dayjs(date)
    .add(bookerLayout.columnViewExtraDays.current, "day")
    .month();

  const isValidDate = dayjs(date).isValid();
  const twoWeeksAfter = dayjs(month).startOf("month").add(2, "week");
  const isSameMonth = dayjs().isSame(dayjs(month), "month");
  const isAfter2Weeks = dayjs().isAfter(twoWeeksAfter);

  const prefetchNextMonth =
    (bookerLayout.layout === BookerLayouts.WEEK_VIEW &&
      !!bookerLayout.extraDays &&
      !isNaN(dateMonth) &&
      !isNaN(monthAfterAddingExtraDays) &&
      dateMonth !== monthAfterAddingExtraDays) ||
    (bookerLayout.layout === BookerLayouts.COLUMN_VIEW &&
      !isNaN(dateMonth) &&
      !isNaN(monthAfterAddingExtraDaysColumnView) &&
      dateMonth !== monthAfterAddingExtraDaysColumnView) ||
    ((bookerLayout.layout === BookerLayouts.MONTH_VIEW || bookerLayout.layout === "mobile") &&
      (!isValidDate || isSameMonth) &&
      isAfter2Weeks);

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
