import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { findUniqueDelegationCalendarCredential } from "@calcom/lib/delegationCredential/server";
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

  static async initFromDelegationCredentialId({
    delegationCredentialId,
    userId,
  }: {
    delegationCredentialId: string;
    userId: number;
  }): Promise<ICalendarCacheRepository> {
    const delegationCredential = await findUniqueDelegationCalendarCredential({
      delegationCredentialId,
      userId,
    });
    const calendar = await getCalendar(delegationCredential);
    return await CalendarCache.init(calendar);
  }

  static async initFromDelegationCredentialOrRegularCredential({
    delegationCredentialId,
    credentialId,
    userId,
  }: {
    credentialId: number | null;
    delegationCredentialId: string | null;
    userId: number;
  }): Promise<ICalendarCacheRepository> {
    if (delegationCredentialId) {
      return await CalendarCache.initFromDelegationCredentialId({ delegationCredentialId, userId });
    } else if (credentialId) {
      return await CalendarCache.initFromCredentialId(credentialId);
    }
    throw new Error("No credential or delegation credential provided");
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
