import type { Session } from "next-auth";

import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type MyStatsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const myStatsHandler = async ({ ctx }: MyStatsOptions) => {
  const { user: sessionUser } = ctx;

  const additionalUserInfo = await prisma.user.findFirst({
    where: {
      id: sessionUser.id,
    },
    select: {
      bookings: {
        select: { id: true },
      },
      selectedCalendars: true,
      teams: {
        select: {
          team: {
            select: {
              id: true,
              eventTypes: true,
            },
          },
        },
      },
      eventTypes: {
        select: { id: true },
      },
    },
  });
  let sumOfTeamEventTypes = 0;
  for (const team of additionalUserInfo?.teams || []) {
    for (const _eventType of team.team.eventTypes) {
      sumOfTeamEventTypes++;
    }
  }

  return {
    id: sessionUser.id,
    sumOfBookings: additionalUserInfo?.bookings.length,
    sumOfCalendars: additionalUserInfo?.selectedCalendars.length,
    sumOfTeams: additionalUserInfo?.teams.length,
    sumOfEventTypes: additionalUserInfo?.eventTypes.length,
    sumOfTeamEventTypes,
  };
};
