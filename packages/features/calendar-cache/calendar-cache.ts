import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCacheRepository } from "./calendar-cache.repository";
import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";
import { CalendarCacheRepositoryMock } from "./calendar-cache.repository.mock";

const log = logger.getSubLogger({ prefix: ["CalendarCache"] });

/**
 * @deprecated This class is deprecated and will be removed in a future version.
 * Use the new calendar-cache-sql feature instead.
 */
export class CalendarCache {
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  static async initFromCredentialId(credentialId: number): Promise<ICalendarCacheRepository> {
    log.debug("initFromCredentialId", safeStringify({ credentialId }));
    const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId });

    const calendarForCalendarCache = await getCalendar(credentialForCalendarCache);
    return await CalendarCache.init(calendarForCalendarCache);
  }
  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * Use the new calendar-cache-sql feature instead.
   */
  static async init(calendar: Calendar | null): Promise<ICalendarCacheRepository> {
    const featureRepo = new FeaturesRepository(prisma);
    const isCalendarCacheEnabledGlobally = await featureRepo.checkIfFeatureIsEnabledGlobally(
      "calendar-cache"
    );
    if (isCalendarCacheEnabledGlobally) return new CalendarCacheRepository(calendar);
    return new CalendarCacheRepositoryMock();
  }
}
