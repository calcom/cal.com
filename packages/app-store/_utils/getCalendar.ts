import { CalendarBatchService } from "@calcom/features/calendar-batch/lib/CalendarBatchService";
import { CalendarBatchWrapper } from "@calcom/features/calendar-batch/lib/CalendarBatchWrapper";
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
  credential: CredentialForCalendarService | null,
  shouldServeCache?: boolean
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

  // eslint-disable-next-line
  const originalCalendar = new CalendarService(credential as any);
  return resolveCalendarServeStrategy(originalCalendar, credential, shouldServeCache);
};

/**
 * Resolve best calendar strategy for current calendar and credential
 */
const resolveCalendarServeStrategy = async (
  originalCalendar: Calendar,
  credential: CredentialForCalendarService,
  shouldServeCache?: boolean
): Promise<Calendar> => {
  // if shouldServeCache is not supplied, determine on the fly.
  if (typeof shouldServeCache === "undefined") {
    const featuresRepository = new FeaturesRepository(prisma);
    const [isCalendarSubscriptionCacheEnabled, isCalendarSubscriptionCacheEnabledForUser] = await Promise.all(
      [
        featuresRepository.checkIfFeatureIsEnabledGlobally(
          CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
        ),
        featuresRepository.checkIfUserHasFeatureNonHierarchical(
          credential.userId as number,
          CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
        ),
      ]
    );
    shouldServeCache = isCalendarSubscriptionCacheEnabled && isCalendarSubscriptionCacheEnabledForUser;
  }
  if (CalendarCacheEventService.isCalendarTypeSupported(credential.type) && shouldServeCache) {
    log.info("Calendar Cache is enabled, using CalendarCacheService for credential", {
      credentialId: credential.id,
    });
    const calendarCacheEventRepository = new CalendarCacheEventRepository(prisma);
    return new CalendarCacheWrapper({
      originalCalendar: originalCalendar as unknown as Calendar,
      calendarCacheEventRepository,
    });
  } else if (CalendarBatchService.isSupported(credential)) {
    // If calendar cache isn't supported, we try calendar batch as the second layer of optimization
    log.info("Calendar Batch is supported, using CalendarBatchService for credential", {
      credentialId: credential.id,
    });
    return new CalendarBatchWrapper({ originalCalendar: originalCalendar as unknown as Calendar });
  }

  // Ended up returning unoptimized original calendar
  log.info("Calendar Cache and Batch aren't supported, serving regular calendar for credential", {
    credentialId: credential.id,
  });
  return originalCalendar;
};
