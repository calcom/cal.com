import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { getCredentialForCalendarService } from "@calcom/core/CalendarManager";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getDwdCalendarCredentialById } from "@calcom/lib/domainWideDelegation/server";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import type { Calendar } from "@calcom/types/Calendar";

import { CalendarCacheRepository } from "./calendar-cache.repository";
import type { ICalendarCacheRepository } from "./calendar-cache.repository.interface";
import { CalendarCacheRepositoryMock } from "./calendar-cache.repository.mock";

export class CalendarCache {
  static async initFromCredentialId(credentialId: number): Promise<ICalendarCacheRepository> {
    const credential = await CredentialRepository.findCredentialForCalendarServiceById({
      id: credentialId,
    });
    const calendar = await getCalendar(credential);
    return await CalendarCache.init(calendar);
  }

  static async initFromDwdId({
    dwdId,
    userId,
  }: {
    dwdId: string;
    userId: number;
  }): Promise<ICalendarCacheRepository> {
    const dwdCredential = await getDwdCalendarCredentialById({ id: dwdId, userId });
    const credentialForCalendarService = await getCredentialForCalendarService(dwdCredential);
    const calendar = await getCalendar(credentialForCalendarService);
    return await CalendarCache.init(calendar);
  }

  static async initFromDwdOrRegularCredential({
    credentialId,
    dwdId,
    userId,
  }: {
    credentialId: number | null;
    dwdId: string | null;
    userId: number;
  }): Promise<ICalendarCacheRepository> {
    if (dwdId) {
      return await CalendarCache.initFromDwdId({ dwdId, userId });
    } else if (credentialId) {
      return await CalendarCache.initFromCredentialId(credentialId);
    }
    throw new Error("No credential or DWD ID provided");
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
