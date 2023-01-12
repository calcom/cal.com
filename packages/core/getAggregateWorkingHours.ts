import { SchedulingType } from "@prisma/client";

import type { WorkingHours } from "@calcom/types/schedule";

/**
 * This function gets team members working hours and busy slots,
 * offsets them to UTC and intersects them for collective events.
 **/
export const getAggregateWorkingHours = (
  usersWorkingHoursAndBusySlots: (Omit<
    Awaited<ReturnType<Awaited<typeof import("./getUserAvailability")>["getUserAvailability"]>>,
    "currentSeats"
  > & { user?: { isFixed?: boolean } })[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  schedulingType: SchedulingType | null
): WorkingHours[] => {
  // during personal events, just flatMap.
  if (!schedulingType) {
    return usersWorkingHoursAndBusySlots.flatMap((s) => s.workingHours);
  }
  const aggregate = usersWorkingHoursAndBusySlots
    .filter(({ user }) => schedulingType === SchedulingType.COLLECTIVE || user?.isFixed)
    .reduce((currentWorkingHours: WorkingHours[], s) => {
      const updatedWorkingHours: typeof currentWorkingHours = [];

      s.workingHours.forEach((workingHour) => {
        const sameDayWorkingHours = currentWorkingHours.filter((compare) =>
          compare.days.find((day) => workingHour.days.includes(day))
        );
        if (!sameDayWorkingHours.length) {
          updatedWorkingHours.push(workingHour); // the first day is always added.
          return;
        }
        // days are overlapping when different users are involved, instead of adding we now need to subtract
        updatedWorkingHours.push(
          ...sameDayWorkingHours.map((compare) => {
            const intersect = workingHour.days.filter((day) => compare.days.includes(day));
            return {
              days: intersect,
              startTime: Math.max(workingHour.startTime, compare.startTime),
              endTime: Math.min(workingHour.endTime, compare.endTime),
            };
          })
        );
      });
      return updatedWorkingHours;
    }, []);
  if (schedulingType === SchedulingType.COLLECTIVE) {
    return aggregate;
  }
  // take the aggregate (collective or fixed round robin hosts) and append unfixed hosts
  return aggregate.concat(
    ...usersWorkingHoursAndBusySlots
      .filter(({ user }) => user?.isFixed !== true)
      .flatMap((s) => s.workingHours)
  );
};
