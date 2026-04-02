import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { isMonthChange } from "./isMonthChange";
import { isMonthViewPrefetchEnabled } from "./isMonthViewPrefetchEnabled";

export const isPrefetchNextMonthEnabled = (
  bookerLayout: string,
  date: string,
  dateMonth: number,
  monthAfterAddingExtraDays: number,
  monthAfterAddingExtraDaysColumnView: number,
  month: string | null,
  extraDays?: number
) => {
  if (bookerLayout === BookerLayouts.WEEK_VIEW) {
    return !!extraDays && isMonthChange(dateMonth, monthAfterAddingExtraDays);
  }

  if (bookerLayout === BookerLayouts.COLUMN_VIEW) {
    return isMonthChange(dateMonth, monthAfterAddingExtraDaysColumnView);
  }

  if (bookerLayout === BookerLayouts.MONTH_VIEW || bookerLayout === "mobile") {
    const shouldPrefetchNextMonth = isMonthViewPrefetchEnabled(date, month);
    return shouldPrefetchNextMonth;
  }

  return false;
};
