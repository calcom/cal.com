import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
import { CalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository";
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import { CalendarCacheWrapper } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheWrapper";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Calendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { CalendarServiceMap } from "../calendar.services.generated";

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

export const getCalendar = async (
  credential: CredentialForCalendarService | null
): Promise<Calendar | null> => {
  if (!credential || !credential.key) return null;
  let { type: calendarType } = credential;
  if (calendarType?.endsWith("_other_calendar")) {
    calendarType = calendarType.split("_other_calendar")[0];
  }
  // Backwards compatibility until CRM manager is created
  if (calendarType?.endsWith("_crm")) {
    calendarType = calendarType.split("_crm")[0];
  }

  /**
   * This should represent the dirName of the app as the generated service map
   * is a Record<dirName, import(dirName/lib/CalendarService)>
   * @see packages/app-store-cli/src/build.ts
   */
  let calendarNameInServiceMap = calendarType.split("_").join("");

  /**
   * The calendar app name is fragile in here and it will fail if the calendar contains
   * a hyphen in the name.
   * zohocalendar for example is in the folder: zohocalendar, the crendetial, when saved,
   * is of type zoho_calendar. The split here will work as the generated service map has the
   * folder name.
   * However, for a calendar like yandex-calendar, the folder is yandex-calendar and the generated
   * config's type is yandex-calendar_calendar (we shouldn't modify this), so if we record
   * the type in the credentials as yandex-calendar_calendar, the split here will result
   * in yandex-calendarcalendar, which is not a valid key in the service map.
   *
   * The correct way is to have CredentialForCalendarService load the app as well and we
   * can use credential.app.dirName to guarantee the correct key in the service map.
   *
   * Another way is to do a roundtrip in the db to get the app and use the dirName.
   *
   * For now, we can just use the appId as it closely resembles the dirName (usually derived from the slug).
   */
  if (!(calendarNameInServiceMap in CalendarServiceMap) && credential.appId) {
    calendarNameInServiceMap = credential.appId;
  }

  const calendarAppImportFn = CalendarServiceMap[calendarNameInServiceMap as keyof typeof CalendarServiceMap];

  if (!calendarAppImportFn) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }

  const calendarApp = await calendarAppImportFn;

  const CalendarService = calendarApp.default;

  if (!CalendarService || typeof CalendarService !== "function") {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }

  // check if Calendar Cache is supported and enabled
  if (CalendarCacheEventService.isCalendarTypeSupported(calendarType)) {
    log.debug(
      `Using regular CalendarService for credential ${credential.id} (not Google or Office365 Calendar)`
    );
    const featuresRepository = new FeaturesRepository(prisma);
    const [isCalendarSubscriptionCacheEnabled, isCalendarSubscriptionCacheEnabledForUser] = await Promise.all(
      [
        featuresRepository.checkIfFeatureIsEnabledGlobally(
          CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
        ),
        featuresRepository.checkIfUserHasFeature(
          credential.userId as number,
          CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
        ),
      ]
    );

    if (isCalendarSubscriptionCacheEnabled && isCalendarSubscriptionCacheEnabledForUser) {
      log.debug(`Calendar Cache is enabled, using CalendarCacheService for credential ${credential.id}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalCalendar = new CalendarService(credential as any);
      if (originalCalendar) {
        // return cacheable calendar
        const calendarCacheEventRepository = new CalendarCacheEventRepository(prisma);
        return new CalendarCacheWrapper({
          originalCalendar,
          calendarCacheEventRepository,
        });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new CalendarService(credential as any);
};
