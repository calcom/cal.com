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
  const sumOfTeamEventTypes = additionalUserInfo?.teams.reduce(
    (sum, team) => sum + team.team.eventTypes.length,
    0
  );

  return {
    id: sessionUser.id,
    sumOfBookings: additionalUserInfo?.bookings.length,
    sumOfCalendars: additionalUserInfo?.selectedCalendars.length,
    sumOfTeams: additionalUserInfo?.teams.length,
    sumOfEventTypes: additionalUserInfo?.eventTypes.length,
    sumOfTeamEventTypes,
  };
};
