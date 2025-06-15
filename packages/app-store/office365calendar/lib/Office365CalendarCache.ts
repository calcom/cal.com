// packages/app-store/office365calendar/lib/Office365CalendarCache.ts
import type Office365CalendarService from "office365calendar/lib/CalendarService";

import { CalendarCache } from "@calcom/features/calendar-cache/calendar-cache";
import type { FreeBusyArgs } from "@calcom/features/calendar-cache/calendar-cache.repository.interface";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { EventBusyDate, IntegrationCalendar } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["Office365CalendarCache"] });

export class Office365CalendarCache {
  private calendarService: Office365CalendarService;
  private credentialId: number;
  private userId: number | null;

  constructor(calendarService: Office365CalendarService) {
    this.calendarService = calendarService;
    this.credentialId = calendarService.getCredential().id;
    this.userId = calendarService.getCredential().userId;
  }

  async getCacheOrFetchAvailability(
    dateFrom: string,
    dateTo: string,
    calendarIds: string[],
    shouldServeCache?: boolean
  ): Promise<EventBusyDate[]> {
    log.info("[Office365CalendarCache] getCacheOrFetchAvailability called", {
      dateFrom,
      dateTo,
      calendarIds,
      shouldServeCache,
      credentialId: this.credentialId,
      userId: this.userId,
    });

    try {
      if (!shouldServeCache) {
        log.info("[Office365CalendarCache] shouldServeCache is false, calling direct fetchAvailability");
        return await this.calendarService.fetchAvailability({
          timeMin: dateFrom,
          timeMax: dateTo,
          items: calendarIds.map((id) => ({ id })),
        });
      }

      log.info("[Office365CalendarCache] shouldServeCache is true, attempting cache lookup");

      // Create calendar cache using credentialId for proper calendar watching support
      const calendarCache = await CalendarCache.initFromCredentialId(this.credentialId);

      // Prepare args for cache lookup - use expanded date ranges like when creating cache
      const cacheArgs: FreeBusyArgs = {
        timeMin: getTimeMin(dateFrom),
        timeMax: getTimeMax(dateTo),
        items: calendarIds.map((id) => ({ id })),
      };

      log.info("[Office365CalendarCache] Checking cache with args", { cacheArgs });

      // Check cache
      const cachedAvailability = await calendarCache.getCachedAvailability({
        credentialId: this.credentialId,
        userId: this.userId,
        args: cacheArgs,
      });

      if (cachedAvailability) {
        log.info("[Cache Hit] Returning cached availability", { dateFrom, dateTo, calendarIds });
        return cachedAvailability.value as unknown as EventBusyDate[];
      }

      // Cache miss - no cached data found
      log.info("[Cache Miss] No cached data found, fetching fresh availability", {
        dateFrom,
        dateTo,
        calendarIds,
      });
      const data = await this.calendarService.fetchAvailability({
        timeMin: dateFrom,
        timeMax: dateTo,
        items: calendarIds.map((id) => ({ id })),
      });
      return data;
    } catch (error) {
      log.error("Error getting cached availability", safeStringify({ error }));
      return [];
    }
  }

  async updateCache(selectedCalendars: IntegrationCalendar[], forceUpdate = false): Promise<void> {
    try {
      // Filter to only include office365 calendars
      const o365Calendars = selectedCalendars.filter((cal) => cal.integration === "office365_calendar");

      if (o365Calendars.length === 0) {
        return;
      }

      // Create calendar cache using credentialId for proper calendar watching support
      const calendarCache = await CalendarCache.initFromCredentialId(this.credentialId);

      // Prepare args - get extended date range for better caching
      const args: FreeBusyArgs = {
        timeMin: getTimeMin(),
        timeMax: getTimeMax(),
        items: o365Calendars.map((cal) => ({ id: cal.externalId })),
      };

      // First check if we already have recent cache data
      if (!forceUpdate) {
        const cachedData = await calendarCache.getCachedAvailability({
          credentialId: this.credentialId,
          userId: this.userId,
          args,
        });

        if (cachedData) {
          const cacheAge = Date.now() - new Date(cachedData.expiresAt || 0).getTime();
          // If cache is less than 5 minutes old, don't update it
          if (cacheAge < 5 * 60 * 1000) {
            log.debug("Cache is recent, skipping update");
            return;
          }
        }
      }

      // Get fresh availability data
      const busyTimes = await this.calendarService.fetchAvailability(args);

      // Store in cache
      await calendarCache.upsertCachedAvailability({
        credentialId: this.credentialId,
        userId: this.userId,
        args,
        value: JSON.parse(JSON.stringify(busyTimes)),
      });

      log.debug(
        "Updated availability cache",
        safeStringify({
          calendarCount: o365Calendars.length,
        })
      );
    } catch (error) {
      log.error("Error updating cache", safeStringify({ error }));
    }
  }
}
