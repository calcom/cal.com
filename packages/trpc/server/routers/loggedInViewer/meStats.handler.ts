import type { Session } from "next-auth";

import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type MeStatsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const meStatsHandler = async ({ ctx }: MeStatsOptions) => {
  const { user: sessionUser } = ctx;

  const additionalUserInfo = await prisma.user.findFirst({
    where: {
      id: sessionUser.id,
    },
       select: {
      _count: {
        select: {
          bookings: true,
          selectedCalendars: true,
          teams: true,
          eventTypes: true,
        },
      },
      teams: {
        select: {
          team: {
            select: {
              eventTypes: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
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
