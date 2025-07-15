import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FeaturesRepository } from "@calcom/features/flags/featuresRepository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCacheRepository } from "./calendarCacheRepository";
import type { ICalendarCacheRepository } from "./calendarCacheRepositoryInterface";
import { CalendarCacheRepositoryMock } from "./calendarCacheRepositoryMock";

const log = logger.getSubLogger({ prefix: ["CalendarCache"] });

export class CalendarCache {
  static async initFromCredentialId(credentialId: number): Promise<ICalendarCacheRepository> {
    log.debug("initFromCredentialId", safeStringify({ credentialId }));
    const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId });

    const calendarForCalendarCache = await getCalendar(credentialForCalendarCache);
    return await CalendarCache.init(calendarForCalendarCache);
  }
  static async init(calendar: Calendar | null): Promise<ICalendarCacheRepository> {
    const featureRepo = new FeaturesRepository();
    const isCalendarCacheEnabledGlobally = await featureRepo.checkIfFeatureIsEnabledGlobally(
      "calendar-cache"
    );
    if (isCalendarCacheEnabledGlobally) return new CalendarCacheRepository(calendar);
    return new CalendarCacheRepositoryMock();
  }
}
