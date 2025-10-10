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

// Cache for resolved calendar services to avoid repeated dynamic imports
const calendarServiceCache = new Map<string, new (...args: unknown[]) => Calendar>();

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

  const calendarAppKey = calendarType.split("_").join("") as keyof typeof CalendarServiceMap;
  const calendarAppImportFn = CalendarServiceMap[calendarAppKey];

  if (!calendarAppImportFn) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }

  // Check cache first for better performance
  let CalendarService = calendarServiceCache.get(calendarAppKey);

  if (!CalendarService) {
    // Handle both static imports (direct class) and dynamic imports (Promise)
    if (typeof calendarAppImportFn === "function") {
      // Static import - direct class
      CalendarService = calendarAppImportFn;
    } else {
      // Dynamic import - Promise that resolves to module
      const calendarApp = await (calendarAppImportFn as Promise<{
        default: new (...args: unknown[]) => Calendar;
      }>);
      CalendarService = calendarApp.default;
    }

    // Cache the resolved service for future use
    if (CalendarService) {
      calendarServiceCache.set(calendarAppKey, CalendarService);
    }
  }

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
