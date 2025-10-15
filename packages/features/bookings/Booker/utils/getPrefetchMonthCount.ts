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

  if (isColumnView) return 2;

  // For month view, only add extra months when:
  // 1. User is selecting time AND
  // 2. We're NOT already prefetching the next month
  // This prevents duplicate calls when bookerState changes to "selecting_time"
  // after the initial data load
  if (!isWeekView && isSelectingTime && !prefetchNextMonth) return 2;

  return undefined;
};
