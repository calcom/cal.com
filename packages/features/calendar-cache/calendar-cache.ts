import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCacheDualRepository } from "./calendar-cache-dual.repository";
import { CalendarCacheRepository } from "./calendar-cache.repository";
import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";
import { CalendarCacheRepositoryMock } from "./calendar-cache.repository.mock";

const log = logger.getSubLogger({ prefix: ["CalendarCache"] });

export class CalendarCache {
  static async initFromCredentialId(credentialId: number): Promise<ICalendarCacheRepository> {
    log.debug("initFromCredentialId", safeStringify({ credentialId }));
    const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId });

    if (!credentialForCalendarCache) {
      return new CalendarCacheRepositoryMock();
    }

    const calendarForCalendarCache = await getCalendar(credentialForCalendarCache);
    return await CalendarCache.init(
      calendarForCalendarCache,
      credentialId,
      credentialForCalendarCache.userId,
      credentialForCalendarCache.teamId
    );
  }

  static async init(
    calendar: Calendar | null,
    credentialId?: number,
    userId?: number | null,
    teamId?: number | null
  ): Promise<ICalendarCacheRepository> {
    const featureRepo = new FeaturesRepository();
    const isCalendarCacheEnabledGlobally = await featureRepo.checkIfFeatureIsEnabledGlobally(
      "calendar-cache"
    );

    if (isCalendarCacheEnabledGlobally) {
      const isSqlWriteEnabled = teamId
        ? await featureRepo.checkIfTeamHasFeature(teamId, "calendar-cache-sql-write")
        : await featureRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-write");

      const isSqlReadEnabled = teamId
        ? await featureRepo.checkIfTeamHasFeature(teamId, "calendar-cache-sql-read")
        : await featureRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-read");

      if ((isSqlWriteEnabled || isSqlReadEnabled) && credentialId !== undefined) {
        return new CalendarCacheDualRepository(calendar, credentialId, userId || null, teamId);
      }

      return new CalendarCacheRepository(calendar);
    }

    return new CalendarCacheRepositoryMock();
  }
}
