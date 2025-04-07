import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { findUniqueDelegationCalendarCredential } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCacheRepository } from "./calendar-cache.repository";
import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";
import { CalendarCacheRepositoryMock } from "./calendar-cache.repository.mock";

const log = logger.getSubLogger({ prefix: ["calendar-cache"] });
export class CalendarCache {
  static async initFromCredentialId(credentialId: number): Promise<ICalendarCacheRepository> {
    const credential = await CredentialRepository.findCredentialForCalendarServiceById({
      id: credentialId,
    });
    const calendar = await getCalendar(credential);
    return await CalendarCache.init(calendar);
  }

  static async initFromDelegationCredentialId({
    delegationCredentialId,
    userId,
  }: {
    delegationCredentialId: string;
    userId: number;
  }): Promise<ICalendarCacheRepository | null> {
    const delegationCredential = await findUniqueDelegationCalendarCredential({
      delegationCredentialId,
      userId,
    });
    if (!delegationCredential) {
      return null;
    }
    const calendar = await getCalendar(delegationCredential);
    return await CalendarCache.init(calendar);
  }

  static async initFromDelegationOrRegularCredential({
    delegationCredentialId,
    credentialId,
    userId,
  }: {
    credentialId: number | null;
    delegationCredentialId: string | null;
    userId: number;
  }): Promise<ICalendarCacheRepository> {
    let calendarCache;
    if (delegationCredentialId) {
      // calendarCache could be null if delegation credential is not enabled
      calendarCache = await CalendarCache.initFromDelegationCredentialId({ delegationCredentialId, userId });
    }

    if (!calendarCache && credentialId) {
      calendarCache = await CalendarCache.initFromCredentialId(credentialId);
    }

    if (!calendarCache) {
      log.error("Could not initialize calendar cache", {
        credentialId,
        delegationCredentialId,
      });
      throw new Error("Could not initialize calendar cache");
    }
    return calendarCache;
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
