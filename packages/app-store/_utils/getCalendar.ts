// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getCalendarCacheEventRepository } from "@calcom/features/calendar-subscription/di/CalendarCacheEventRepository.container";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getCalendarSubscriptionService } from "@calcom/features/calendar-subscription/di/CalendarSubscriptionService.container";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CalendarCacheWrapper } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheWrapper";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CalendarTelemetryWrapper } from "@calcom/features/calendar-subscription/lib/telemetry/CalendarTelemetryWrapper";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getFeaturesRepository } from "@calcom/features/di/containers/FeaturesRepository";
import logger from "@calcom/lib/logger";
import { isTelemetryEnabled } from "@calcom/lib/sentryWrapper";
import type { Calendar, CalendarFetchMode } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import { CalendarServiceMap } from "../calendar.services.generated";

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

export const getCalendar = async (
  credential: CredentialForCalendarService | null,
  mode: CalendarFetchMode = "none"
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

  const createCalendarService = calendarApp.default;

  if (!createCalendarService || typeof createCalendarService !== "function") {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }

  // Determine if we should use cache based on mode:
  // - "slots": Check feature flags and use cache when available (for getting actual calendar availability)
  // - "overlay": Don't use cache (for overlay calendar availability)
  // - "booking": Don't use cache (for booking confirmation)
  // - "none": Don't use cache (for operations that don't use getAvailability, e.g., deleteEvent, listCalendars)
  let shouldServeCache = false;
  if (mode === "slots") {
    const featuresRepository = getFeaturesRepository();
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
    log.debug("Cache feature flag check", {
      credentialId: credential.id,
      userId: credential.userId,
      mode,
      isCalendarSubscriptionCacheEnabled,
      isCalendarSubscriptionCacheEnabledForUser,
      shouldServeCache,
    });
  } else {
    log.debug("Cache disabled for mode", {
      credentialId: credential.id,
      userId: credential.userId,
      mode,
    });
  }

  const isCacheSupported = CalendarCacheEventService.isCalendarTypeSupported(calendarType);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalCalendar = createCalendarService(credential as any);

  // Determine if we should use cache
  const useCache = isCacheSupported && shouldServeCache;

  // Build the calendar chain: original -> cache (if enabled) -> telemetry (if enabled)
  let calendar: Calendar = originalCalendar;

  if (useCache) {
    log.debug(`Calendar Cache is enabled, using CalendarCacheWrapper for credential ${credential.id}`);
    calendar = new CalendarCacheWrapper({
      originalCalendar: calendar,
      calendarCacheEventRepository: getCalendarCacheEventRepository(),
      onDemandSync: async (calendarId: string) => {
        const service = getCalendarSubscriptionService();
        await service.syncById(calendarId);
      },
    });
  }

  // Wrap ALL calendars with telemetry when telemetry is enabled
  // This provides consistent metrics for all calendar types
  if (isTelemetryEnabled()) {
    log.debug(
      `Using CalendarTelemetryWrapper for credential ${credential.id} (cacheSupported: ${isCacheSupported}, cacheEnabled: ${useCache})`
    );
    calendar = new CalendarTelemetryWrapper({
      originalCalendar: calendar,
      calendarType,
      cacheSupported: isCacheSupported,
      cacheEnabled: useCache,
      credentialId: credential.id,
      mode,
    });
  }

  return calendar;
};
