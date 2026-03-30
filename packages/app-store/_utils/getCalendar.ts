// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getCalendarCacheEventRepository } from "@calcom/features/calendar-subscription/di/CalendarCacheEventRepository.container";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getCalendarSubscriptionService } from "@calcom/features/calendar-subscription/di/CalendarSubscriptionService.container";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CalendarCacheWrapper } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheWrapper";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { CalendarTelemetryWrapper } from "@calcom/features/calendar-subscription/lib/telemetry/CalendarTelemetryWrapper";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
// biome-ignore lint/style/noRestrictedImports: pre-existing violation
import { getUserFeatureRepository } from "@calcom/features/di/containers/UserFeatureRepository";
import logger from "@calcom/lib/logger";
import { isTelemetryEnabled } from "@calcom/lib/sentryWrapper";
import type { Calendar, CalendarFetchMode } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import { CalendarServiceMap } from "../calendar.services.generated";

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

/**
 * Determines whether the calendar cache should be used for this credential.
 *
 * Cache usage is based on mode:
 * - "slots": Check feature flags and use cache when available (for getting actual calendar availability)
 * - "overlay": Don't use cache (for overlay calendar availability)
 * - "booking": Don't use cache (for booking confirmation)
 * - "none": Don't use cache (for operations that don't use getAvailability, e.g., deleteEvent, listCalendars)
 *
 * When a batch-prefetched Set is available, uses O(1) lookup.
 * Otherwise falls back to per-credential feature flag queries.
 */
async function shouldUseCalendarCache(
  credential: CredentialForCalendarService,
  mode: CalendarFetchMode,
  // userId would be here only if calendar-cache is enabled globally as well
  calendarCacheEnabledForUserIds?: Set<number>
): Promise<boolean> {
  if (mode !== "slots") {
    log.debug("Cache disabled for mode", {
      credentialId: credential.id,
      userId: credential.userId,
      mode,
    });
    return false;
  }

  if (!credential.userId) {
    return false;
  }

  if (calendarCacheEnabledForUserIds) {
    const isEnabledForCredential = calendarCacheEnabledForUserIds.has(credential.userId);
    log.debug("Cache feature flag check", {
      credentialId: credential.id,
      userId: credential.userId,
      isEnabledForCredential,
    });
    return isEnabledForCredential;
  }

  const featureRepository = getFeatureRepository();
  const userFeatureRepository = getUserFeatureRepository();
  const [isGloballyEnabled, isEnabledForUser] = await Promise.all([
    featureRepository.checkIfFeatureIsEnabledGlobally(
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
    ),
    userFeatureRepository.checkIfUserHasFeatureNonHierarchical(
      credential.userId,
      CalendarSubscriptionService.CALENDAR_SUBSCRIPTION_CACHE_FEATURE
    ),
  ]);

  log.debug("Cache feature flag check", {
    credentialId: credential.id,
    userId: credential.userId,
    isGloballyEnabled,
    isEnabledForUser,
    shouldServeCache: isGloballyEnabled && isEnabledForUser,
  });

  return isGloballyEnabled && isEnabledForUser;
}

export const getCalendar = async ({
  credential,
  mode = "none",
  prefetchedCalendarCacheEventRepository,
  calendarCacheEnabledForUserIds,
}: {
  credential: CredentialForCalendarService | null | undefined;
  mode?: CalendarFetchMode;
  prefetchedCalendarCacheEventRepository?: ICalendarCacheEventRepository | null;
  calendarCacheEnabledForUserIds?: Set<number>;
}): Promise<Calendar | null> => {
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

  const shouldServeCache = await shouldUseCalendarCache(credential, mode, calendarCacheEnabledForUserIds);

  const isCacheSupported = CalendarCacheEventService.isCalendarTypeSupported(calendarType);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalCalendar = createCalendarService(credential as any);

  const useCache = isCacheSupported && shouldServeCache;

  // Build the calendar chain: original -> cache (if enabled) -> telemetry (if enabled)
  let calendar: Calendar = originalCalendar;

  if (useCache) {
    log.debug(`Calendar Cache is enabled, using CalendarCacheWrapper for credential ${credential.id}`);
    calendar = new CalendarCacheWrapper({
      originalCalendar: calendar,
      calendarCacheEventRepository: prefetchedCalendarCacheEventRepository ?? getCalendarCacheEventRepository(),
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
