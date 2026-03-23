import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import type { CalendarAvailableTimeslots } from "@calcom/features/calendars/weeklyview/types/state";
import type { IFromUser, IToUser } from "@calcom/features/availability/lib/getUserAvailability";

export interface IGetAvailableSlots {
  slots: Record<
    string,
    {
      time: string;
      attendees?: number | undefined;
      bookingUid?: string | undefined;
      away?: boolean | undefined;
      fromUser?: IFromUser | undefined;
      toUser?: IToUser | undefined;
      reason?: string | undefined;
      emoji?: string | undefined;
      showNotePublicly?: boolean | undefined;
    }[]
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  troubleshooter?: any;
}

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
