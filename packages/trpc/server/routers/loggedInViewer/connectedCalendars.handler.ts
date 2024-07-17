import { getConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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

  const { connectedCalendars, destinationCalendar } = await getConnectedDestinationCalendars(
    user,
    onboarding,
    prisma
  );

  return {
    connectedCalendars,
    destinationCalendar,
  };
};
