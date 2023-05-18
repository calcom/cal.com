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
    return looseHostAvailability;
  }
  s;

  const fixedHostDateRanges = fixedHosts.map((s) => s.dateRanges);

  // use intersect method here that finds collective availabilities that overlap
  const intersectedAvailability = intersect(fixedHostDateRanges);

  return intersectedAvailability;
};
