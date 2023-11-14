import type { DateRange } from "@calcom/lib/date-ranges";
import { intersect } from "@calcom/lib/date-ranges";
import { SchedulingType } from "@calcom/prisma/enums";

import { mergeOverlappingDateRanges } from "./date-range-utils/mergeOverlappingDateRanges";

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

/**
 * handles the availability of the unfixed hosts, by deciding whether the
 * multi-round-robin-hosts special case is present
 *
 * @param unfixedHosts availabilities of the unfixed hosts
 * @param roundRobinHostCount this is the number of hosts who need to participate,
 * @return only those DateRanges at which at least roundRobinHostCount many hosts are available
 */
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
  // intersect all combinations
  const collectiveAvailability: DateRange[] = [];
  dateCombinations.forEach((elem) => collectiveAvailability.push(...intersect(elem)));

  return collectiveAvailability;
}

/**
 * for round robin with multiple hosts we need to look at all possible combinations
 * with 'hostnum' elements
 * This is just a simple: Create all k-element combinations of the items in an array
 *
 * @param hostDates the DateRanges of each provided host which need to be combined
 * @param roundRobinHostCount this is the number of hosts who need to participate,
 *                            for the algorithm it's the k, as in k-element combinations
 * @return all combinations of DateRanges (with roundRobinHostCount-elements) of the provided hosts
 */
function getDateRangeCombinations(hostDates: DateRange[][], roundRobinHostCount: number): DateRange[][] {
  const result: DateRange[][] = [];

  function combine(current: DateRange[][], start: number) {
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
