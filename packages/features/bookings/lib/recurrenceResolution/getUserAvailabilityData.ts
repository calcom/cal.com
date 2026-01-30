import type { Availability } from "@prisma/client";

import prisma from "@calcom/prisma";

/**
 * Represents a weekly recurring availability window
 */
export interface AvailabilityWindow {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // HH:mm format (e.g., "09:00")
  endTime: string; // HH:mm format (e.g., "17:00")
  timeZone: string;
}

/**
 * Complete user availability data for recurring booking computation
 */
export interface UserAvailabilityData {
  scheduleId: number;
  timeZone: string;
  availabilityWindows: AvailabilityWindow[];
  outOfOfficeEntries: Array<{
    start: Date;
    end: Date;
  }>;
}

type AvailabilityLite = Pick<Availability, "days" | "startTime" | "endTime" | "date">;
/**
 * User schedule data that's already fetched in handleNewBooking
 */
export interface PreFetchedSchedule {
  id: number;
  timeZone: string | null;
  availability: AvailabilityLite[];
}

/**
 * Fetches user availability data for recurring booking logic.
 *
 * OPTIMIZATION: Accepts pre-fetched schedule data to avoid redundant DB queries else goes on to fetch one
 * The schedule is already fetched in handleNewBooking via:
 * `const userSchedule = user?.schedules.find(schedule => schedule.id === user?.defaultScheduleId)`
 *
 * @param userId - The user ID to fetch OOO entries for
 * @param preFetchedSchedule - Schedule data already loaded in handler (REQUIRED)
 * @returns Complete availability data including schedule windows and OOO periods
 *
 * @throws Error if preFetchedSchedule is not provided
 */
export async function getUserAvailabilityData({
  userId,
  eventTypeScheduleId,
  hostDefaultScheduleId,
  preFetchedSchedule,
}: {
  userId: number;
  eventTypeScheduleId?: number;
  hostDefaultScheduleId?: number | null;
  preFetchedSchedule?: PreFetchedSchedule | null;
}): Promise<UserAvailabilityData> {
  // Fetch schedule if not pre-fetched
  if (!preFetchedSchedule) {
    const scheduleId = eventTypeScheduleId || hostDefaultScheduleId;

    if (!scheduleId) {
      throw new Error(
        "Either eventTypeScheduleId, hostDefaultScheduleId, or preFetchedSchedule must be provided"
      );
    }

    preFetchedSchedule = await prisma.schedule.findFirst({
      where: { id: scheduleId },
      select: {
        id: true,
        timeZone: true,
        availability: {
          select: {
            startTime: true,
            endTime: true,
            date: true,
            days: true,
          },
        },
      },
    });

    if (!preFetchedSchedule) {
      throw new Error(`Schedule with id ${scheduleId} not found`);
    }
  }

  // Fetch future out-of-office entries (only thing we need from DB)
  const now = new Date();
  const outOfOfficeEntries = await prisma.outOfOfficeEntry.findMany({
    where: {
      userId,
      end: { gte: now }, // Only future or ongoing OOO periods
    },
    select: {
      start: true,
      end: true,
    },
    orderBy: { start: "asc" },
  });

  // Transform availability entries to normalized windows
  const availabilityWindows = transformAvailabilityToWindows(
    preFetchedSchedule.availability,
    preFetchedSchedule.timeZone || "UTC"
  );

  return {
    scheduleId: preFetchedSchedule.id,
    timeZone: preFetchedSchedule.timeZone || "UTC",
    availabilityWindows,
    outOfOfficeEntries: outOfOfficeEntries.map((e) => ({
      start: e.start,
      end: e.end,
    })),
  };
}

/**
 * Transforms Prisma availability entries into normalized windows.
 * Handles multiple days per availability entry by expanding them.
 *
 * IMPORTANT: Cal.com stores time-of-day using 1970-01-01 as a placeholder date.
 * For example, 2:15 PM is stored as "1970-01-01T14:15:00.000Z" (UTC).
 * We need to extract just the time component (HH:mm) for comparison.
 */
function transformAvailabilityToWindows(
  availabilityEntries: AvailabilityLite[],
  defaultTimeZone: string
): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];

  for (const entry of availabilityEntries) {
    // Skip date-specific overrides (handle only recurring weekly patterns)
    if (entry.date) {
      continue;
    }

    const startTime = formatTime(entry.startTime);
    const endTime = formatTime(entry.endTime);

    // Expand each availability entry for all applicable days
    for (const dayOfWeek of entry.days) {
      windows.push({
        dayOfWeek,
        startTime,
        endTime,
        timeZone: defaultTimeZone,
      });
    }
  }

  return windows;
}

/**
 * Formats a Date object to HH:mm string in UTC.
 *
 * Cal.com stores time-of-day values using 1970-01-01 as placeholder:
 * - "1970-01-01T14:15:00.000Z" represents 2:15 PM UTC
 * - "1970-01-01T23:00:00.000Z" represents 11:00 PM UTC
 *
 * We extract the UTC hours and minutes to get the time-of-day.
 *
 * @example
 * formatTime(new Date("1970-01-01T14:15:00.000Z")) // "14:15"
 * formatTime(new Date("1970-01-01T09:00:00.000Z")) // "09:00"
 */
function formatTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
