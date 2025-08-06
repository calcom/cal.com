import { CalendarCacheRepository } from "./calendar-cache.repository";

export interface CacheStatus {
  credentialId: number;
  updatedAt: Date | null;
}

export interface EnrichedCalendarData {
  credentialId: number;
  cacheStatus: CacheStatus | null;
}

export class CalendarCacheService {
  private cacheRepository: CalendarCacheRepository;

  constructor() {
    this.cacheRepository = new CalendarCacheRepository();
  }

  /**
   * Fetches cache status for multiple credentials
   */
  async getCacheStatusByCredentialIds(credentialIds: number[]): Promise<CacheStatus[]> {
    if (credentialIds.length === 0) {
      return [];
    }

    return await this.cacheRepository.getCacheStatusByCredentialIds(credentialIds);
  }

  /**
   * Enriches calendar data with cache information
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
