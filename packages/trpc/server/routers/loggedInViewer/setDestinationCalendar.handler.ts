import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { DestinationCalendarRepository } from "@calcom/lib/server/repository/destinationCalendar";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TSetDestinationCalendarInputSchema } from "./setDestinationCalendar.schema";

type SessionUser = NonNullable<TrpcSessionUser>;
type User = {
  id: SessionUser["id"];
  selectedCalendars: SessionUser["selectedCalendars"];
  email: SessionUser["email"];
};

type SetDestinationCalendarOptions = {
  ctx: {
    user: User;
  };
  input: TSetDestinationCalendarInputSchema;
};

export const setDestinationCalendarHandler = async ({ ctx, input }: SetDestinationCalendarOptions) => {
  const { user } = ctx;
  const { integration, externalId, eventTypeId } = input;
  const credentials = await getUsersCredentials(user);
  const calendarCredentials = await getCalendarCredentials(credentials);
  const { connectedCalendars } = await getConnectedCalendars(calendarCredentials, user.selectedCalendars);
  const allCals = connectedCalendars.map((cal) => cal.calendars ?? []).flat();

  const calendar = allCals.find(
    (cal) => cal.externalId === externalId && cal.integration === integration && cal.readOnly === false
  );
  const { credentialId, domainWideDelegationCredentialId } = calendar || {};

  if (!credentialId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Could not find calendar ${input.externalId}` });
  }

  const primaryEmail = allCals.find((cal) => cal.primary && cal.credentialId === credentialId)?.email ?? null;

  let where;

  if (eventTypeId) {
    if (
      !(await prisma.eventType.findFirst({
        where: {
          id: eventTypeId,
          userId: user.id,
        },
      }))
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `You don't have access to event type ${eventTypeId}`,
      });
    }

    where = { eventTypeId };
  } else where = { userId: user.id };

  await DestinationCalendarRepository.upsert({
    where,
    update: {
      integration,
      externalId,
      primaryEmail,
      credentialId,
      domainWideDelegationCredentialId,
    },
    create: {
      ...where,
      integration,
      externalId,
      primaryEmail,
      credentialId,
      domainWideDelegationCredentialId,
    },
  });
};
