import { CalendarCacheSqlService } from "@calcom/features/calendar-cache-sql/CalendarCacheSqlService";
import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository";
import { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/lib/getConnectedDestinationCalendars";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
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

  const subscriptionRepo = new CalendarSubscriptionRepository(prisma);
  const eventRepo = new CalendarEventRepository(prisma);
  const selectedCalendarRepo = new SelectedCalendarRepository(prisma);
  const sqlCacheService = new CalendarCacheSqlService(subscriptionRepo, eventRepo, selectedCalendarRepo);

  const enrichedWithSqlCache = await sqlCacheService.enrichCalendarsWithSqlCacheData(connectedCalendars);

  const enrichedConnectedCalendars = connectedCalendars.map((calendar, index) => {
    const enrichedCalendar = enrichedWithSqlCache[index];

    // Ensure we always preserve the enriched properties, even if enrichment fails
    const enrichedCalendars = calendar.calendars?.map((cal) => {
      const enrichedCal = enrichedCalendar?.calendars?.find(
        (enriched) => enriched.externalId === cal.externalId
      );

      return {
        ...cal,
        sqlCacheUpdatedAt: enrichedCal?.sqlCacheUpdatedAt ?? null,
        sqlCacheSubscriptionCount: enrichedCal?.sqlCacheSubscriptionCount ?? 0,
      };
    });

    return {
      ...calendar,
      calendars: enrichedCalendars,
    };
  });

  return {
    connectedCalendars: enrichedConnectedCalendars,
    destinationCalendar,
  };
};
