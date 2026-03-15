import type { IntegrationCalendar } from "@calcom/types/Calendar";

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
