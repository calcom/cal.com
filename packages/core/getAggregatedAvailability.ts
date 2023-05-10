import type { DateRange } from "@calcom/lib/date-ranges";
import { intersect } from "@calcom/lib/date-ranges";
import { SchedulingType } from "@calcom/prisma/enums";

export const getAggregatedAvailability = (
  usersWorkingHoursAndBusySlots: (Omit<
    Awaited<ReturnType<Awaited<typeof import("./getUserAvailability")>["getUserAvailability"]>>,
    "currentSeats"
  > & { user?: { isFixed?: boolean } })[],
  schedulingType: SchedulingType | null
): DateRange[] => {
  // during personal events, just flatMap.
  if (!schedulingType) {
    return usersWorkingHoursAndBusySlots.flatMap((s) => s.freeBusy);
  }
  const looseHostAvailability = usersWorkingHoursAndBusySlots
    .filter(({ user }) => schedulingType !== SchedulingType.COLLECTIVE && user?.isFixed !== true)
    .flatMap((s) => s.freeBusy);

  const fixedHosts = usersWorkingHoursAndBusySlots.filter(
    ({ user }) => schedulingType === SchedulingType.COLLECTIVE || user?.isFixed
  );
  // return early when there are no fixed hosts.
  if (!fixedHosts.length) {
    return looseHostAvailability;
  }

  const fixedHostDateRanges = fixedHosts.map((s) => {
    return { ranges: s.freeBusy };
  });

  // use intersect method here that finds collective availabilities that overlap
  const intersectedAvailability = intersect(fixedHostDateRanges);

  return intersectedAvailability;
};
