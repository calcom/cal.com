import { CalendarCacheService } from "./calendar-cache.service";

/**
 * @deprecated This class is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export class CalendarCacheEnrichmentService {
  private legacyCacheService: CalendarCacheService;

  /**
   * @deprecated This constructor is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  constructor() {
    this.legacyCacheService = new CalendarCacheService();
  }

  /**
   * Enriches calendar data with legacy cache information only
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async enrichCalendarsWithAllCacheData<T extends { credentialId: number }>(
    calendars: T[]
  ): Promise<(T & { 
    cacheUpdatedAt: Date | null; 
    sqlCacheUpdatedAt: Date | null; 
    sqlCacheSubscriptionCount: number 
  })[]> {
    if (calendars.length === 0) {
      return [];
    }

    // Enrich with legacy cache only since this service is deprecated
    const enrichedWithLegacyCache = await this.legacyCacheService.enrichCalendarsWithCacheData(calendars);

    // Return calendars with legacy cache data and null SQL cache data
    return calendars.map((calendar) => {
      const legacyCacheData = enrichedWithLegacyCache.find(c => c.credentialId === calendar.credentialId);
      
      return {
        ...calendar,
        cacheUpdatedAt: legacyCacheData?.cacheUpdatedAt || null,
        sqlCacheUpdatedAt: null, // SQL cache functionality removed from deprecated service
        sqlCacheSubscriptionCount: 0, // SQL cache functionality removed from deprecated service
      };
    });
  }
} 
