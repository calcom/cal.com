import type { IntegrationCalendar } from "@calcom/types/Calendar";
import ICAL from "ical.js";

/**
 * Returns the Apple Travel Time duration (x-apple-travel-duration) in seconds.
 * Returns 0 if the property is absent or cannot be parsed.
 */
export const getTravelDurationInSeconds = (vevent: ICAL.Component): number => {
  const travelDuration: ICAL.Duration = vevent.getFirstPropertyValue("x-apple-travel-duration");
  if (!travelDuration) return 0;
  try {
    const travelSeconds = travelDuration.toSeconds();
    if (!Number.isInteger(travelSeconds)) return 0;
    return travelSeconds;
  } catch {
    return 0;
  }
};

/**
 * Shifts the event start time back by the given number of seconds to account
 * for Apple's Travel Time (x-apple-travel-duration).
 */
export const applyTravelDuration = (event: ICAL.Event, seconds: number): ICAL.Event => {
  if (seconds <= 0) return event;
  event.startDate.second -= seconds;
  return event;
};

/**
 * Retrieves the timezone of a user from the database.
 * Shared utility for ICS-based calendar services (ics-feedcalendar, protoncalendar, etc.)
 */
export const getUserTimezoneFromDB = async (id: number): Promise<string | undefined> => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { timeZone: true },
  });
  return user?.timeZone;
};

/**
 * Extracts the user ID from the first calendar in an array of IntegrationCalendars.
 */
export const getUserId = (selectedCalendars: IntegrationCalendar[]): number | null => {
  if (selectedCalendars.length === 0) return null;
  return selectedCalendars[0].userId || null;
};
