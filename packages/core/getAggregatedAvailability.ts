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
  const aggregatedAvailability: DateRange[] = intersect(fixedHosts.map((s) => s.dateRanges));
  // fixed hosts, everyone will be added
  if (schedulingType !== SchedulingType.ROUND_ROBIN) {
    return mergeOverlappingDateRanges(aggregatedAvailability);
  }
  // unfixed, one or more people will be selected.
  aggregatedAvailability.push(
    ...userAvailability.filter(({ user }) => user?.isFixed !== true).flatMap((s) => s.dateRanges)
  );
  return mergeOverlappingDateRanges(aggregatedAvailability);
};

function mergeOverlappingDateRanges(dateRanges: DateRange[]) {
  const sortedDateRanges = dateRanges.sort((a, b) => a.start.diff(b.start)); //is it already sorted before?

  const mergedDateRanges: DateRange[] = [];

  let currentRange = sortedDateRanges[0];

  for (let i = 1; i < sortedDateRanges.length; i++) {
    const nextRange = sortedDateRanges[i];
    if (
      currentRange.start.format("DD MM YY") === nextRange.start.format("DD MM YY") &&
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
