import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { DefaultAdapterFactory } from "@calcom/features/calendar-subscription/adapters/AdaptersFactory";
import { CalendarSubscriptionService } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionService";
import { CalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository";
import { CalendarCacheEventService } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventService";
import { CalendarSyncService } from "@calcom/features/calendar-subscription/lib/sync/CalendarSyncService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { SelectedCalendarRepository } from "@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository";
import { prisma } from "@calcom/prisma";

export type CalendarSubscriptionRolloutResult = {
  skipped: boolean;
};

export async function runCalendarSubscriptionRollout(): Promise<CalendarSubscriptionRolloutResult> {
  const bookingRepository = new BookingRepository(prisma);
  const calendarSyncService = new CalendarSyncService({
    bookingRepository,
  });
  const calendarCacheEventRepository = new CalendarCacheEventRepository(prisma);
  const calendarCacheEventService = new CalendarCacheEventService({
    calendarCacheEventRepository,
  });

  const calendarSubscriptionService = new CalendarSubscriptionService({
    adapterFactory: new DefaultAdapterFactory(),
    selectedCalendarRepository: new SelectedCalendarRepository(prisma),
    featuresRepository: new FeaturesRepository(prisma),
    calendarSyncService,
    calendarCacheEventService,
  });

  const [isCacheEnabled, isSyncEnabled] = await Promise.all([
    calendarSubscriptionService.isCacheEnabled(),
    calendarSubscriptionService.isSyncEnabled(),
  ]);

  if (!isCacheEnabled && !isSyncEnabled) {
    return { skipped: true };
  }

  await calendarSubscriptionService.checkForNewSubscriptions();
  return { skipped: false };
}
