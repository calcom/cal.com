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
  const cacheStatuses = await prisma.calendarCache.groupBy({
    by: ["credentialId"],
    where: {
      credentialId: { in: credentialIds },
    },
    _max: {
      updatedAt: true,
    },
  });

  const cacheStatusMap = new Map(cacheStatuses.map((cache) => [cache.credentialId, cache._max.updatedAt]));

  const enrichedConnectedCalendars = connectedCalendars.map((calendar) => ({
    ...calendar,
    cacheUpdatedAt: cacheStatusMap.get(calendar.credentialId) || null,
  }));

  return {
    connectedCalendars: enrichedConnectedCalendars,
    destinationCalendar,
  };
};
