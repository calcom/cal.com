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
  // during personal events, just flatMap.
  if (!schedulingType) {
    return intersect([...userAvailability.map((user) => user.dateRanges)]);
  }
  const looseHostAvailability = userAvailability
    .filter(({ user }) => schedulingType !== SchedulingType.COLLECTIVE && user?.isFixed !== true)
    .flatMap((s) => s.dateRanges);

  const fixedHosts = userAvailability.filter(
    ({ user }) => schedulingType === SchedulingType.COLLECTIVE || user?.isFixed
  );
  // return early when there are no fixed hosts.
  if (!fixedHosts.length) {
    const availabiltiesWithoutOverlaps = mergeOverlappingDateRanges(looseHostAvailability);
    return availabiltiesWithoutOverlaps;
  }

  const fixedHostDateRanges = fixedHosts.map((s) => s.dateRanges);

  // use intersect method here that finds collective availabilities that overlap
  const intersectedAvailability = intersect(fixedHostDateRanges);

  return intersectedAvailability;
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
