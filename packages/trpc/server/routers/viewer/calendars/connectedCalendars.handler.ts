import { CalendarCacheService } from "@calcom/features/calendar-cache/calendar-cache.service";
import { CalendarCacheSqlService } from "@calcom/features/calendar-cache-sql/calendar-cache-sql.service";
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
  const sqlCacheService = new CalendarCacheSqlService();
  
  const [enrichedWithLegacyCache, enrichedWithSqlCache] = await Promise.all([
    cacheService.enrichCalendarsWithCacheData(connectedCalendars),
    sqlCacheService.enrichCalendarsWithSqlCacheData(connectedCalendars),
  ]);

  // Merge the results
  const finalCalendars = connectedCalendars.map((calendar, index) => ({
    ...calendar,
    cacheUpdatedAt: enrichedWithLegacyCache[index]?.cacheUpdatedAt || null,
    calendars: enrichedWithSqlCache[index]?.calendars || calendar.calendars,
  }));

  return {
    connectedCalendars: finalCalendars,
    destinationCalendar,
  };
};
