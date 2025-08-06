import logger from "@calcom/lib/logger";

import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheRepositoryMock"] });

/**
 * @deprecated This class is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export class CalendarCacheRepositoryMock implements ICalendarCacheRepository {
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async watchCalendar() {
    log.info(`Skipping watchCalendar due to calendar-cache being disabled`);
  }
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async upsertCachedAvailability() {
    log.info(`Skipping upsertCachedAvailability due to calendar-cache being disabled`);
  }
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async getCachedAvailability() {
    log.info(`Skipping getCachedAvailability due to calendar-cache being disabled`);
    return null;
  }

  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async unwatchCalendar() {
    log.info(`Skipping unwatchCalendar due to calendar-cache being disabled`);
  }

  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async deleteManyByCredential() {
    log.info(`Skipping deleteManyByCredential due to calendar-cache being disabled`);
  }

  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  async getCacheStatusByCredentialIds() {
    log.info(`Skipping getCacheStatusByCredentialIds due to calendar-cache being disabled`);
    return [];
  }
}
