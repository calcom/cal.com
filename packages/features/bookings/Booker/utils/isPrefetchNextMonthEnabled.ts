import type { BookerLayouts } from "@calcom/prisma/zod-utils";

import { isLastWeekOfMonth } from "./isLastWeekOfMonth";
import { isMonthViewPrefetchEnabled } from "./isMonthViewPrefetchEnabled";

export const isPrefetchNextMonthEnabled = (
  bookerLayout: BookerLayouts | "mobile",
  date: string,
  month: string | null
) => {
  if (bookerLayout === "week_view" || bookerLayout === "column_view") {
    const shouldPrefetchNextMonth = isLastWeekOfMonth(date);
    return shouldPrefetchNextMonth;
  }

  if (bookerLayout === "month_view" || bookerLayout === "mobile") {
    const shouldPrefetchNextMonth = isMonthViewPrefetchEnabled(date, month);
    return shouldPrefetchNextMonth;
  }
};
