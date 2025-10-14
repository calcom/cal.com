import { BookerLayouts } from "@calcom/prisma/zod-utils";

import type { BookerState } from "../types";
import { areDifferentValidMonths } from "./areDifferentValidMonths";

export const getPrefetchMonthCount = (
  bookerLayout: string,
  bookerState: BookerState,
  firstMonth: number,
  secondMonth: number
) => {
  const isDifferentMonth = areDifferentValidMonths(firstMonth, secondMonth);

  const isWeekView = bookerLayout === BookerLayouts.WEEK_VIEW;
  const isColumnView = bookerLayout === BookerLayouts.COLUMN_VIEW;
  const isSelectingTime = bookerState === "selecting_time";

  if (!isDifferentMonth) return undefined;

  if (isColumnView || (!isWeekView && isSelectingTime)) return 2;

  return undefined;
};
