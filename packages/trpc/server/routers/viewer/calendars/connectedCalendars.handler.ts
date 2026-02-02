import { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { PrismaClient } from "@calcom/prisma";
import type { TConnectedCalendarsInputSchema } from "./connectedCalendars.schema";

type ConnectedCalendarsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
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
  ctx: { user, prisma },
  input,
}: ConnectedCalendarsOptions): Promise<ConnectedCalendarsHandlerResult> => {
  const onboarding = input?.onboarding || false;

  const { connectedCalendars, destinationCalendar } =
    await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
      user,
      onboarding,
      eventTypeId: input?.eventTypeId ?? null,
      skipSync: input?.skipSync ?? false,
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
