import { BookerLayouts } from "@calcom/prisma/zod-utils";

import type { BookerState } from "../types";
import { areDifferentValidMonths } from "./areDifferentValidMonths";

export const getPrefetchMonthCount = (
  bookerLayout: string,
  bookerState: BookerState,
  firstMonth: number,
  secondMonth: number,
  prefetchNextMonth: boolean
) => {
  const isDifferentMonth = areDifferentValidMonths(firstMonth, secondMonth);

  const isWeekView = bookerLayout === BookerLayouts.WEEK_VIEW;
  const isColumnView = bookerLayout === BookerLayouts.COLUMN_VIEW;
  const isSelectingTime = bookerState === "selecting_time";

  if (!isDifferentMonth) return undefined;

  // Column view always needs 2 months because it displays multiple weeks side-by-side,
  // regardless of user state or whether we're already prefetching
  if (isColumnView) return 2;

  // Month view conditionally needs an extra month for performance optimization.
  // Only return 2 when:
  // 1. User is selecting time slots (improves UX by preloading more availability)
  // 2. We're NOT already prefetching next month (prevents duplicate API calls)
  //
  // If prefetchNextMonth is already true (e.g., viewing dates after 15th of month),
  // we don't need extra months since the next month is already being fetched via prefetchNextMonth
  if (!isWeekView && isSelectingTime && !prefetchNextMonth) return 2;

  return undefined;
};
