import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
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

  const credentialIds = connectedCalendars.map((cal) => cal.credentialId);
  const cacheRepository = new CalendarCacheRepository();
  const cacheStatuses = await cacheRepository.getCacheStatusByCredentialIds(credentialIds);

  const cacheStatusMap = new Map(cacheStatuses.map((cache) => [cache.credentialId, cache.updatedAt]));

  const enrichedConnectedCalendars = connectedCalendars.map((calendar) => ({
    ...calendar,
    cacheUpdatedAt: cacheStatusMap.get(calendar.credentialId) || null,
  }));

  return {
    connectedCalendars: enrichedConnectedCalendars,
    destinationCalendar,
  };
};
