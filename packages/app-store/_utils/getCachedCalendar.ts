import { calendarCacheStore } from "@calcom/features/calendar-cache/calendar-cache-store";
import logger from "@calcom/lib/logger";
import type { Calendar, IntegrationCalendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { getCalendar } from "./getCalendar";

const log = logger.getSubLogger({ prefix: ["getCachedCalendar"] });

/**
 * Determines if a user has complete cache hits for all their calendar credentials
 * This is used to decide whether to use CachedCalendarService or the regular calendar service
 */
export const hasCompleteCacheHits = (
  userId: number,
  credentials: CredentialForCalendarService[],
  selectedCalendars: IntegrationCalendar[],
  dateFrom: string,
  dateTo: string
): boolean => {
  if (!credentials.length || !selectedCalendars.length) {
    return false;
  }

  const googleCredentials = credentials.filter((cred) => cred.type === "google_calendar");
  if (!googleCredentials.length) {
    return false;
  }

  const calendarItemsByCredentialId: Record<number, { id: string }[]> = {};

  selectedCalendars.forEach((calendar) => {
    if (!calendar.credentialId) return;

    if (!calendarItemsByCredentialId[calendar.credentialId]) {
      calendarItemsByCredentialId[calendar.credentialId] = [];
    }

    calendarItemsByCredentialId[calendar.credentialId].push({ id: calendar.externalId });
  });

  const userCredentials = googleCredentials.map((cred) => ({
    userId,
    credentialId: cred.id,
  }));

  const usersWithCacheHits = calendarCacheStore.getUsersWithCompleteCacheHits(
    userCredentials,
    dateFrom,
    dateTo,
    calendarItemsByCredentialId
  );

  return usersWithCacheHits.includes(userId);
};

/**
 * Gets the appropriate calendar service based on cache availability
 * Returns CachedCalendarService if the user has 100% cache hits, otherwise returns the regular calendar service
 * This function will never return null - it will throw an error if no calendar can be created
 */
export const getCachedCalendar = async (
  credential: CredentialForCalendarService,
  userId: number | undefined,
  selectedCalendars: IntegrationCalendar[] | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined
): Promise<Calendar> => {
  if (!credential || !credential.key) {
    throw new Error("No valid credential provided for calendar service");
  }
  if (
    credential.type === "google_calendar" &&
    userId !== undefined &&
    selectedCalendars !== undefined &&
    dateFrom !== undefined &&
    dateTo !== undefined
  ) {
    const userSelectedCalendars = selectedCalendars.filter((cal) => cal.userId === userId);

    const hasCacheHits = hasCompleteCacheHits(userId, [credential], userSelectedCalendars, dateFrom, dateTo);

    if (hasCacheHits) {
      log.debug(`Using CachedCalendarService for user ${userId} with credential ${credential.id}`);
      try {
        const { CachedCalendarService } = await import("@calcom/app-store/googlecalendar");

        // Create and return the cached calendar service
        const cachedCalendarService = new CachedCalendarService(credential);
        return cachedCalendarService;
      } catch (error) {
        log.error(`Error loading CachedCalendarService: ${error}`);
        // getCalendar might return null, but we need to return a Calendar
        const calendar = await getCalendar(credential);
        if (!calendar) {
          throw new Error(`Failed to create calendar service for credential ${credential.id}`);
        }
        return calendar as Calendar;
      }
    }
  }

  // Get the regular calendar service
  // getCalendar might return null, but we need to return a Calendar
  const calendar = await getCalendar(credential);
  if (!calendar) {
    throw new Error(`Failed to create calendar service for credential ${credential.id}`);
  }
  return calendar as Calendar;
};
