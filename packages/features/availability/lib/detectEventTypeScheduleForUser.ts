import type { GetUserAvailabilityInitialData } from "./getUserAvailability";

export type ScheduleWithoutTimeZone = {
  id: number;
  availability?: {
    days: number[];
    startTime: Date;
    endTime: Date;
    date: Date | null;
  }[];
};

export const DEFAULT_SCHEDULE_DATA: ScheduleWithoutTimeZone = {
  availability: [
    {
      startTime: new Date("1970-01-01T09:00:00Z"),
      endTime: new Date("1970-01-01T17:00:00Z"),
      days: [1, 2, 3, 4, 5], // Monday to Friday
      date: null,
    },
  ],
  id: 0,
};

export type DetectEventTypeScheduleForUserInput = {
  eventType?: {
    hosts: {
      user: {
        id: number;
      };
      schedule:
        | (ScheduleWithoutTimeZone & {
            timeZone: string | null;
          })
        | null;
    }[];
    timeZone: string | null;
    schedule:
      | (ScheduleWithoutTimeZone & {
          timeZone: string | null;
        })
      | null;
  } | null;
  user: {
    schedules: NonNullable<GetUserAvailabilityInitialData["user"]>["schedules"];
    defaultScheduleId: number | null;
    timeZone: string;
    id: number;
  };
};

export type DetectEventTypeScheduleForUserOutput = {
  isDefaultSchedule: boolean;
  isTimezoneSet: boolean;
  schedule: ScheduleWithoutTimeZone & {
    timeZone: string;
  };
};

export function detectEventTypeScheduleForUser({
  eventType,
  user,
}: DetectEventTypeScheduleForUserInput): DetectEventTypeScheduleForUserOutput {
  const userSchedule = user.schedules.filter(
    (schedule) => !user?.defaultScheduleId || schedule.id === user?.defaultScheduleId
  )[0];
  const hostSchedule = eventType?.hosts?.find((host) => host.user.id === user.id)?.schedule;

  // TODO: It uses default timezone of user. Should we use timezone of team ?
  const fallbackTimezoneIfScheduleIsMissing = eventType?.timeZone || user.timeZone;

  const fallbackSchedule = {
    ...DEFAULT_SCHEDULE_DATA,
    timeZone: fallbackTimezoneIfScheduleIsMissing,
  };

  let potentialSchedule = null;

  if (eventType?.schedule) {
    potentialSchedule = eventType.schedule;
  } else if (hostSchedule) {
    potentialSchedule = hostSchedule;
  } else if (userSchedule) {
    potentialSchedule = userSchedule;
  }

  const schedule = potentialSchedule ?? fallbackSchedule;

  const isDefaultSchedule = !!(userSchedule && userSchedule.id === schedule?.id);

  const isTimezoneSet = Boolean(potentialSchedule && potentialSchedule.timeZone !== null);

  return {
    isDefaultSchedule,
    isTimezoneSet,
    schedule: {
      ...schedule,
      timeZone: schedule.timeZone || fallbackTimezoneIfScheduleIsMissing,
    },
  };
}
