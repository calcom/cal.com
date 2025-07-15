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

  const credentialIds = connectedCalendars.flatMap(
    (calendar) => calendar.calendars?.map((cal) => cal.credentialId) || []
  );

  const cacheEntries =
    credentialIds.length > 0
      ? await prisma.calendarCache.findMany({
          where: {
            credentialId: { in: credentialIds },
            expiresAt: { gte: new Date() },
          },
          select: {
            credentialId: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        })
      : [];

  const cacheStatus = cacheEntries.reduce((acc, entry) => {
    if (!acc[entry.credentialId] || entry.updatedAt > acc[entry.credentialId]) {
      acc[entry.credentialId] = entry.updatedAt;
    }
    return acc;
  }, {} as Record<number, Date>);

  return {
    connectedCalendars,
    destinationCalendar,
    cacheStatus,
  };
};
