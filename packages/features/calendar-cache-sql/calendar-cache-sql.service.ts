import { CalendarSubscriptionRepository } from "./CalendarSubscriptionRepository";
import { CalendarEventRepository } from "./CalendarEventRepository";
import { prisma } from "@calcom/prisma";

export class CalendarCacheSqlService {
  private subscriptionRepo: CalendarSubscriptionRepository;
  private eventRepo: CalendarEventRepository;

  constructor() {
    this.subscriptionRepo = new CalendarSubscriptionRepository(prisma);
    this.eventRepo = new CalendarEventRepository(prisma);
  }

  /**
   * Enriches calendar data with SQL cache information at the individual calendar level
   */
  async enrichCalendarsWithSqlCacheData<T extends { 
    credentialId: number; 
    calendars?: { externalId: string; name?: string }[] 
  }>(
    calendars: T[]
  ): Promise<(T & { 
    calendars?: (T['calendars'][0] & { 
      sqlCacheUpdatedAt: Date | null; 
      sqlCacheSubscriptionCount: number;
    })[] 
  })[]> {
    if (calendars.length === 0) {
      return [];
    }

    // Get all unique external IDs and credential IDs
    const calendarLookups = calendars
      .flatMap(cal => (cal.calendars || []).map(calendar => ({
        externalId: calendar.externalId,
        credentialId: cal.credentialId,
      })));

    // Find SelectedCalendar records for each external ID and credential ID combination
    const selectedCalendarIds = await Promise.all(
      calendarLookups.map(async ({ externalId, credentialId }) => {
        const selectedCalendar = await prisma.selectedCalendar.findFirst({
          where: {
            externalId,
            credentialId,
          },
        });
        return {
          externalId,
          credentialId,
          selectedCalendarId: selectedCalendar?.id || null,
        };
      })
    );

    // Get subscriptions for each selected calendar ID that exists
    const validSelectedCalendarIds = selectedCalendarIds
      .filter(item => item.selectedCalendarId !== null)
      .map(item => item.selectedCalendarId!);

    const cacheStatuses = await Promise.all(
      validSelectedCalendarIds.map(async (selectedCalendarId) => {
        const subscription = await this.subscriptionRepo.findBySelectedCalendar(selectedCalendarId);
        
        return {
          selectedCalendarId,
          lastSyncAt: subscription?.updatedAt || null,
          subscriptionCount: subscription ? 1 : 0,
        };
      })
    );
    
    const cacheStatusMap = new Map(
      cacheStatuses.map((cache) => [
        cache.selectedCalendarId, 
        { updatedAt: cache.lastSyncAt, subscriptionCount: cache.subscriptionCount }
      ])
    );

    // Create a map from externalId+credentialId to cache status
    const externalIdCredentialIdToCacheMap = new Map();
    selectedCalendarIds.forEach(({ externalId, credentialId, selectedCalendarId }) => {
      if (selectedCalendarId) {
        const cacheInfo = cacheStatusMap.get(selectedCalendarId);
        externalIdCredentialIdToCacheMap.set(`${externalId}_${credentialId}`, cacheInfo);
      }
    });

    return calendars.map((calendar) => {
      const enrichedCalendars = calendar.calendars?.map(cal => {
        const cacheKey = `${cal.externalId}_${calendar.credentialId}`;
        const cacheInfo = externalIdCredentialIdToCacheMap.get(cacheKey);
        
        return {
          ...cal,
          sqlCacheUpdatedAt: cacheInfo?.updatedAt || null,
          sqlCacheSubscriptionCount: cacheInfo?.subscriptionCount || 0,
        };
      });

      return {
        ...calendar,
        calendars: enrichedCalendars,
      };
    });
  }
} 
