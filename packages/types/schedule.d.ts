export type TimeRange = {
  userId?: number | null;
  start: Date;
  end: Date;
  timeZone?: string;
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
  userId?: number | null;
};
