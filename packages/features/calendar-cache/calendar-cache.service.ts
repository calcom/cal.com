import { CalendarCacheRepository } from "./calendar-cache.repository";

/**
 * @deprecated This interface is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export interface CacheStatus {
  credentialId: number;
  updatedAt: Date | null;
}

/**
 * @deprecated This interface is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export interface EnrichedCalendarData {
  credentialId: number;
  cacheStatus: CacheStatus | null;
}

/**
 * @deprecated This class is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export class CalendarCacheService {
  private cacheRepository: CalendarCacheRepository;

  /**
   * @deprecated This constructor is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  constructor() {
    this.cacheRepository = new CalendarCacheRepository();
  }

  /**
   * Fetches cache status for multiple credentials
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async getCacheStatusByCredentialIds(credentialIds: number[]): Promise<CacheStatus[]> {
    if (credentialIds.length === 0) {
      return [];
    }

    return await this.cacheRepository.getCacheStatusByCredentialIds(credentialIds);
  }

  /**
   * Enriches calendar data with cache information
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async enrichCalendarsWithCacheData<T extends { credentialId: number }>(
    calendars: T[]
  ): Promise<(T & { cacheUpdatedAt: Date | null })[]> {
    if (calendars.length === 0) {
      return [];
    }

    const credentialIds = calendars.map((cal) => cal.credentialId);
    const cacheStatuses = await this.getCacheStatusByCredentialIds(credentialIds);
    
    const cacheStatusMap = new Map(
      cacheStatuses.map((cache) => [cache.credentialId, cache.updatedAt])
    );

    return calendars.map((calendar) => ({
      ...calendar,
      cacheUpdatedAt: cacheStatusMap.get(calendar.credentialId) || null,
    }));
  }
} 
