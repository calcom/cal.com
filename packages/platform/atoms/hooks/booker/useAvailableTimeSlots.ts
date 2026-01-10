import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";
import type { IGetAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";

interface UseAvailableTimeSlotsProps {
  eventDuration: number;
  schedule?: IGetAvailableSlots;
}

export const useAvailableTimeSlots = ({ schedule, eventDuration }: UseAvailableTimeSlotsProps) => {
  return useMemo(() => {
    const availableTimeslots: CalendarAvailableTimeslots = {};
    if (!schedule || !schedule.slots) return availableTimeslots;

    for (const day in schedule.slots) {
      availableTimeslots[day] = schedule.slots[day].map((slot) => {
        const { time, ...rest } = slot;
        return {
          start: dayjs(time).toDate(),
          end: dayjs(time).add(eventDuration, "minutes").toDate(),
          ...rest,
        };
      });
    }

    return availableTimeslots;
  }, [schedule, eventDuration]);
};
