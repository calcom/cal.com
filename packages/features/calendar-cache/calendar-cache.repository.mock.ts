import logger from "@calcom/lib/logger";

import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";

const log = logger.getSubLogger({ prefix: ["CalendarCacheRepositoryMock"] });

export class CalendarCacheRepositoryMock implements ICalendarCacheRepository {
  async watchSelectedCalendar() {
    log.info(`Skipping watchSelectedCalendar due to calendar-cache being disabled`);
  }
  async upsertCachedAvailability() {
    log.info(`Skipping upsertCachedAvailability due to calendar-cache being disabled`);
  }
  async getCachedAvailability() {
    log.info(`Skipping getCachedAvailability due to calendar-cache being disabled`);
    return null;
  }

  async unwatchSelectedCalendar() {
    log.info(`Skipping unwatchSelectedCalendar due to calendar-cache being disabled`);
  }

  async deleteManyByCredential() {
    log.info(`Skipping deleteManyByCredential due to calendar-cache being disabled`);
  }

  async getCalendarService() {
    log.info(`Skipping getCalendarService due to calendar-cache being disabled`);
    return null;
  }
}
