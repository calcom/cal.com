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
  console.log("getCalendar", credential);
  if (!credential || !credential.key) return null;
  let { type: calendarType } = credential;
  if (calendarType?.endsWith("_other_calendar")) {
    calendarType = calendarType.split("_other_calendar")[0];
  }
  // Backwards compatibility until CRM manager is created
  if (calendarType?.endsWith("_crm")) {
    calendarType = calendarType.split("_crm")[0];
  }

  const calendarAppImportFn =
    CalendarServiceMap[calendarType.split("_").join("") as keyof typeof CalendarServiceMap];

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
  if (CalendarCacheEventService.isAppSupported(credential.appId)) {
    console.log("Calendar Cache is supported and enabled", JSON.stringify(credential));
    log.debug(
      `Using regular CalendarService for credential ${credential.id} (not Google or Office365 Calendar)`
    );
    const featuresRepository = new FeaturesRepository(prisma);
    const isCalendarSubscriptionCacheEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
      "calendar-subscription-cache"
    );

    if (isCalendarSubscriptionCacheEnabled) {
      log.debug(
        `calendar-subscription-cache is enabled, using CalendarCacheService for credential ${credential.id}`
      );
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
