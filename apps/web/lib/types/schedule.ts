export type TimeRange = {
  start: Date;
  end: Date;
};

export type Schedule = TimeRange[][];

/**
 * ```text
 * Ensure startTime and endTime in minutes since midnight; serialized to UTC by using the organizer timeZone, either by using the schedule timeZone or the user timeZone.
 * @see lib/availability.ts getWorkingHours(timeZone: string, availability: Availability[])
 * ```
 */
export type WorkingHours = {
  days: number[];
  startTime: number;
  endTime: number;
};

export type TravelSchedule = {
  id: number;
  timeZone: string;
  userId: number;
  startDate: Date;
  endDate: Date | null;
  prevTimeZone: string | null;
};
