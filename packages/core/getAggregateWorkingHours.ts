import { SchedulingType } from "@prisma/client";

import type { WorkingHours } from "@calcom/types/schedule";

/**
 * This function gets team members working hours and busy slots,
 * offsets them to UTC and intersects them for collective events.
 **/
export const getAggregateWorkingHours = (
  usersWorkingHoursAndBusySlots: Omit<
    Awaited<ReturnType<Awaited<typeof import("./getUserAvailability")>["getUserAvailability"]>>,
    "currentSeats"
  >[],
  schedulingType: SchedulingType | null
): WorkingHours[] => {
  if (schedulingType !== SchedulingType.COLLECTIVE) {
    return usersWorkingHoursAndBusySlots.flatMap((s) => s.workingHours);
  }
  return usersWorkingHoursAndBusySlots.reduce((currentWorkingHours: WorkingHours[], s) => {
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
};
