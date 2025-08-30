import logger from "@calcom/lib/logger";

import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheRepositoryMock"] });

export class CalendarCacheRepositoryMock implements ICalendarCacheRepository {
  async watchCalendar() {
    log.info(`Skipping watchCalendar due to calendar-cache being disabled`);
  }
  async upsertCachedAvailability() {
    log.info(`Skipping upsertCachedAvailability due to calendar-cache being disabled`);
  }
  async getCachedAvailability() {
    log.info(`Skipping getCachedAvailability due to calendar-cache being disabled`);
    return null;
  }

  async unwatchCalendar() {
    log.info(`Skipping unwatchCalendar due to calendar-cache being disabled`);
  }

  async deleteManyByCredential() {
    log.info(`Skipping deleteManyByCredential due to calendar-cache being disabled`);
  }

  async getCacheStatusByCredentialIds() {
    log.info(`Skipping getCacheStatusByCredentialIds due to calendar-cache being disabled`);
    return [];
  }
}
