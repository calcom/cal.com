import { CalendarCacheService } from "./calendar-cache.service";
import { CalendarCacheSqlService } from "@calcom/features/calendar-cache-sql/calendar-cache-sql.service";

/**
 * @deprecated This class is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export class CalendarCacheEnrichmentService {
  private legacyCacheService: CalendarCacheService;
  private sqlCacheService: CalendarCacheSqlService;

  /**
   * @deprecated This constructor is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  constructor() {
    this.legacyCacheService = new CalendarCacheService();
    this.sqlCacheService = new CalendarCacheSqlService();
  }

  /**
   * Enriches calendar data with both legacy and SQL cache information
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

    // Enrich with both cache systems independently
    const [enrichedWithLegacyCache, enrichedWithSqlCache] = await Promise.all([
      this.legacyCacheService.enrichCalendarsWithCacheData(calendars),
      this.sqlCacheService.enrichCalendarsWithSqlCacheData(calendars),
    ]);

    // Create maps for efficient lookup by credentialId
    const legacyCacheMap = new Map(
      enrichedWithLegacyCache.map((calendar) => [calendar.credentialId, calendar.cacheUpdatedAt])
    );
    
    const sqlCacheMap = new Map(
      enrichedWithSqlCache.map((calendar) => [
        calendar.credentialId, 
        { 
          sqlCacheUpdatedAt: calendar.sqlCacheUpdatedAt, 
          sqlCacheSubscriptionCount: calendar.sqlCacheSubscriptionCount 
        }
      ])
    );

    // Merge the cache data from both systems
    return calendars.map((calendar) => {
      const legacyCacheData = legacyCacheMap.get(calendar.credentialId);
      const sqlCacheData = sqlCacheMap.get(calendar.credentialId);
      
      return {
        ...calendar,
        cacheUpdatedAt: legacyCacheData || null,
        sqlCacheUpdatedAt: sqlCacheData?.sqlCacheUpdatedAt || null,
        sqlCacheSubscriptionCount: sqlCacheData?.sqlCacheSubscriptionCount || 0,
      };
    });
  }
} 
