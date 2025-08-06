import { CalendarCacheService } from "@calcom/features/calendar-cache/calendar-cache.service";
import { CalendarCacheSqlService } from "@calcom/features/calendar-cache-sql/CalendarCacheSqlService";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository";
import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/lib/getConnectedDestinationCalendars";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TConnectedCalendarsInputSchema } from "./connectedCalendars.schema";

type ConnectedCalendarsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TConnectedCalendarsInputSchema;
};

export const connectedCalendarsHandler = async ({ ctx, input }: ConnectedCalendarsOptions) => {
  const { user } = ctx;
  const onboarding = input?.onboarding || false;

  const { connectedCalendars, destinationCalendar } =
    await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
      user,
      onboarding,
      eventTypeId: input?.eventTypeId ?? null,
      prisma,
    });

  // Use cache services independently
  const cacheService = new CalendarCacheService();
  const subscriptionRepo = new CalendarSubscriptionRepository(prisma);
  const eventRepo = new CalendarEventRepository(prisma);
  const selectedCalendarRepo = new SelectedCalendarRepository();
  const sqlCacheService = new CalendarCacheSqlService(subscriptionRepo, eventRepo, selectedCalendarRepo);
  
  const [enrichedWithLegacyCache, enrichedWithSqlCache] = await Promise.all([
    cacheService.enrichCalendarsWithCacheData(connectedCalendars),
    sqlCacheService.enrichCalendarsWithSqlCacheData(connectedCalendars),
  ]);

  // Merge the results
  const finalCalendars = connectedCalendars.map((calendar, index) => {
    const enrichedCalendar = enrichedWithSqlCache[index];
    return {
      ...calendar,
      cacheUpdatedAt: enrichedWithLegacyCache[index]?.cacheUpdatedAt || null,
      calendars: enrichedCalendar?.calendars || calendar.calendars,
    };
  });

  return {
    connectedCalendars: finalCalendars,
    destinationCalendar,
  };
};
