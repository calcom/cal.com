import type { DateRange } from "@calcom/lib/date-ranges";
import { intersect } from "@calcom/lib/date-ranges";
import { SchedulingType } from "@calcom/prisma/enums";

export const getAggregatedAvailability = (
  userAvailability: { dateRanges: DateRange[]; user?: { isFixed?: boolean } }[],
  schedulingType: SchedulingType | null,
  roundRobinHostCount: number
): DateRange[] => {
  const fixedHosts = userAvailability.filter(
    ({ user }) => !schedulingType || schedulingType === SchedulingType.COLLECTIVE || user?.isFixed
  );

  const dateRangesToIntersect = fixedHosts.map((s) => s.dateRanges);

  const unfixedHosts = userAvailability.filter(({ user }) => user?.isFixed !== true);
  if (unfixedHosts.length) {
    dateRangesToIntersect.push(getUnfixedHostsDateRanges(unfixedHosts, roundRobinHostCount));
  }

  const availability = intersect(dateRangesToIntersect);

  return mergeOverlappingDateRanges(availability);
};

function getUnfixedHostsDateRanges(
  unfixedHosts: { dateRanges: DateRange[]; user?: { isFixed?: boolean } }[],
  roundRobinHostCount: number
): DateRange[] {
  if (unfixedHosts.length == 0 || roundRobinHostCount == 0) return [];

  if (unfixedHosts.length == 1 || roundRobinHostCount == 1) {
    return unfixedHosts.flatMap((s) => s.dateRanges);
  }

  // this is the multi-host round robin case
  const hostDates = unfixedHosts.map((s) => s.dateRanges);
  const dateCombinations = getDateRangeCombinations(hostDates, roundRobinHostCount);
  // intesect all combinations
  const collectiveAvailability: DateRange[] = [];
  dateCombinations.forEach((elem) => collectiveAvailability.push(...intersect(elem)));

  return collectiveAvailability;
}

// for rund robin with multiple hosts we need to look at all possible combinations
// with 'hostnum' elements
function getDateRangeCombinations(hostDates: DateRange[][], roundRobinHostCount: number): DateRange[][] {
  const result: DateRange[][] = [];

  function combine(current: DateRange[][], start) {
    if (current.length === roundRobinHostCount) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < hostDates.length; i++) {
      current.push(hostDates[i]);
      combine(current, i + 1);
      current.pop();
    }
  }

  combine([], 0);
  return result;
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

function mergeOverlappingDateRanges(dateRanges: DateRange[]) {
  dateRanges.sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const mergedDateRanges: DateRange[] = [];

  let currentRange = dateRanges[0];
  if (!currentRange) {
    return [];
  }

  for (let i = 1; i < dateRanges.length; i++) {
    const nextRange = dateRanges[i];
    if (
      isSameDay(currentRange.start.toDate(), nextRange.start.toDate()) &&
      currentRange.end.valueOf() > nextRange.start.valueOf()
    ) {
      currentRange = {
        start: currentRange.start,
        end: currentRange.end.valueOf() > nextRange.end.valueOf() ? currentRange.end : nextRange.end,
      };
    } else {
      mergedDateRanges.push(currentRange);
      currentRange = nextRange;
    }
  }
  mergedDateRanges.push(currentRange);

  return mergedDateRanges;
}
