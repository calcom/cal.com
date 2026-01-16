import { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TConnectedCalendarsInputSchema } from "./connectedCalendars.schema";

type ConnectedCalendarsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TConnectedCalendarsInputSchema;
};

type GetConnectedDestinationCalendarsAndEnsureDefaultsInDbResult = Awaited<
  ReturnType<typeof getConnectedDestinationCalendarsAndEnsureDefaultsInDb>
>;

type ConnectedCalendarsHandlerResult = {
  destinationCalendar: GetConnectedDestinationCalendarsAndEnsureDefaultsInDbResult["destinationCalendar"];
  connectedCalendars: (GetConnectedDestinationCalendarsAndEnsureDefaultsInDbResult["connectedCalendars"][number] & {
    cacheUpdatedAt: null;
  })[];
};

export const connectedCalendarsHandler = async ({
  ctx,
  input,
}: ConnectedCalendarsOptions): Promise<ConnectedCalendarsHandlerResult> => {
  const { user } = ctx;
  const autoSelectCalendarForConflictCheck = input?.autoSelectCalendarForConflictCheck || false;

  const { connectedCalendars, destinationCalendar } =
    await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
      user,
      autoSelectCalendarForConflictCheck,
      eventTypeId: input?.eventTypeId ?? null,
      prisma,
    });

  const enrichedConnectedCalendars = connectedCalendars.map((calendar) => ({
    ...calendar,
    cacheUpdatedAt: null,
  }));

  return {
    connectedCalendars: enrichedConnectedCalendars,
    destinationCalendar,
  };
};
