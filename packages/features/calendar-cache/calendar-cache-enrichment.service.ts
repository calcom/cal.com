import { CalendarCacheService } from "./calendar-cache.service";
import { CalendarCacheSqlService } from "@calcom/features/calendar-cache-sql/calendar-cache-sql.service";

export class CalendarCacheEnrichmentService {
  private legacyCacheService: CalendarCacheService;
  private sqlCacheService: CalendarCacheSqlService;

  constructor() {
    this.legacyCacheService = new CalendarCacheService();
    this.sqlCacheService = new CalendarCacheSqlService();
  }

  /**
   * Enriches calendar data with both legacy and SQL cache information
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