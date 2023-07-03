import type { DateRange } from "@calcom/lib/date-ranges";
import { intersect } from "@calcom/lib/date-ranges";
import { SchedulingType } from "@calcom/prisma/enums";

export const getAggregatedAvailability = (
  userAvailability: (Omit<
    Awaited<ReturnType<Awaited<typeof import("./getUserAvailability")>["getUserAvailability"]>>,
    "currentSeats"
  > & { user?: { isFixed?: boolean } })[],
  schedulingType: SchedulingType | null
): DateRange[] => {
  const fixedHosts = userAvailability.filter(
    ({ user }) => !schedulingType || schedulingType === SchedulingType.COLLECTIVE || user?.isFixed
  );

  const dateRangesToIntersect = fixedHosts.map((s) => s.dateRanges);

  const unfixedHosts = userAvailability.filter(({ user }) => user?.isFixed !== true);
  if (unfixedHosts.length) {
    dateRangesToIntersect.push(unfixedHosts.flatMap((s) => s.dateRanges));
  }

  const availability = intersect(dateRangesToIntersect);

  return mergeOverlappingDateRanges(availability);
};

function mergeOverlappingDateRanges(dateRanges: DateRange[]) {
  const sortedDateRanges = dateRanges.sort((a, b) => a.start.diff(b.start)); //is it already sorted before?

  const mergedDateRanges: DateRange[] = [];

  let currentRange = sortedDateRanges[0];
  if (!currentRange) {
    return [];
  }

  for (let i = 1; i < sortedDateRanges.length; i++) {
    const nextRange = sortedDateRanges[i];
    if (
      currentRange.start.utc().format("DD MM YY") === nextRange.start.utc().format("DD MM YY") &&
      currentRange.end.isAfter(nextRange.start)
    ) {
      currentRange = {
        start: currentRange.start,
        end: currentRange.end.isAfter(nextRange.end) ? currentRange.end : nextRange.end,
      };
    } else {
      mergedDateRanges.push(currentRange);
      currentRange = nextRange;
    }
  }
  mergedDateRanges.push(currentRange);

  return mergedDateRanges;
}
