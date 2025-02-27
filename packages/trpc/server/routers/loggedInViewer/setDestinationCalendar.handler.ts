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
  email: SessionUser["email"];
  userLevelSelectedCalendars: SessionUser["userLevelSelectedCalendars"];
};

type SetDestinationCalendarOptions = {
  ctx: {
    user: User;
  };
  input: TSetDestinationCalendarInputSchema;
};

type ConnectedCalendar = Awaited<ReturnType<typeof getConnectedCalendars>>["connectedCalendars"][number];
type ConnectedCalendarCalendar = NonNullable<ConnectedCalendar["calendars"]>[number];
export const getFirstConnectedCalendar = ({
  connectedCalendars,
  matcher,
}: {
  connectedCalendars: ConnectedCalendar[];
  matcher: (calendar: ConnectedCalendarCalendar) => boolean;
}) => {
  const calendars = connectedCalendars.flatMap((c) => c.calendars ?? []);
  const matchingCalendars = calendars.filter(matcher);
  const dwdCredentialCalendar = matchingCalendars.find((cal) => !!cal.domainWideDelegationCredentialId);

  // Prefer DWD credential calendar as there could be other one due to existing connections even after DWD is enabled.
  if (dwdCredentialCalendar) {
    return dwdCredentialCalendar;
  } else {
    return matchingCalendars[0];
  }
};

/**
 * It identifies the destination calendar by externalId, integration and eventTypeId and doesn't consider the `credentialId` or destinationCalendar.id
 * Also, DestinationCalendar doesn't have unique constraint on externalId, integration and eventTypeId, so there could be multiple destinationCalendars with same externalId, integration and eventTypeId in DB.
 * So, it could update any of the destinationCalendar when there are duplicates in DB. Ideally we should have unique constraint on externalId, integration and eventTypeId.
 *
 * With the addition of DWD credential, it adds another dimension to the problem.
 * A user could have DWD and non-DWD credential for the same calendar and he might be selecting DWD credential connected calendar but it could still be set with nullish destinationCalendar.domainWideDelegationCredentialId.
 */
export const setDestinationCalendarHandler = async ({ ctx, input }: SetDestinationCalendarOptions) => {
  const { user } = ctx;
  const { integration, externalId, eventTypeId } = input;
  const credentials = await getUsersCredentials(user);
  const calendarCredentials = getCalendarCredentials(credentials);
  const { connectedCalendars } = await getConnectedCalendars(
    calendarCredentials,
    user.userLevelSelectedCalendars
  );

  const allCals = connectedCalendars.map((cal) => cal.calendars ?? []).flat();

  const firstConnectedCalendar = getFirstConnectedCalendar({
    connectedCalendars,
    matcher: (cal) =>
      cal.externalId === externalId && cal.integration === integration && cal.readOnly === false,
  });

  const { credentialId, domainWideDelegationCredentialId } = firstConnectedCalendar || {};

  let where;

  if (!credentialId && !domainWideDelegationCredentialId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Could not find calendar ${input.externalId}` });
  }

  const primaryEmail =
    allCals.find(
      (cal) =>
        cal.primary &&
        (cal.credentialId === credentialId ||
          cal.domainWideDelegationCredentialId === domainWideDelegationCredentialId)
    )?.email ?? null;

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
