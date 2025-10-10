import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { isLastWeekOfMonth } from "./isLastWeekOfMonth";
import { isMonthViewPrefetchEnabled } from "./isMonthViewPrefetchEnabled";

export const isPrefetchNextMonthEnabled = (bookerLayout: string, date: string, month: string | null) => {
  if (bookerLayout === BookerLayouts.WEEK_VIEW || bookerLayout === BookerLayouts.COLUMN_VIEW) {
    const shouldPrefetchNextMonth = isLastWeekOfMonth(date);
    return shouldPrefetchNextMonth;
  }

  if (bookerLayout === BookerLayouts.MONTH_VIEW || bookerLayout === "mobile") {
    const shouldPrefetchNextMonth = isMonthViewPrefetchEnabled(date, month);
    return shouldPrefetchNextMonth;
  }
};
