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
  userId?: number,
  selectedCalendars?: IntegrationCalendar[],
  dateFrom?: string,
  dateTo?: string
): Promise<Calendar> => {
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
        const { default: CachedCalendarService } = await import(
          "@calcom/app-store/googlecalendar/lib/CachedCalendarService"
        );

        // Create and return the cached calendar service
        return new CachedCalendarService(credential);
      } catch (error) {
        log.error(`Error loading CachedCalendarService: ${error}`);
        const regularCalendar = await getCalendar(credential);
        if (!regularCalendar) {
          throw new Error(`Failed to get calendar for credential type: ${credential.type}`);
        }
        return regularCalendar;
      }
    }
  }

  // Get the regular calendar service
  const regularCalendar = await getCalendar(credential);
  if (!regularCalendar) {
    throw new Error(`Failed to get calendar for credential type: ${credential.type}`);
  }
  return regularCalendar as Calendar;
};
