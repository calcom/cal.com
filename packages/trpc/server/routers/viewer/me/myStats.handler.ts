import type { Session } from "next-auth";

import { UserRepository } from "@calcom/lib/server/repository/user";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type MyStatsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const myStatsHandler = async ({ ctx }: MyStatsOptions) => {
  const { user: sessionUser } = ctx;

  const additionalUserInfo = await UserRepository.getUserStats({ userId: sessionUser.id });

  const sumOfTeamEventTypes = additionalUserInfo?.teams.reduce(
    (sum, team) => sum + team.team.eventTypes.length,
    0
  );

  return {
    id: sessionUser.id,
    sumOfBookings: additionalUserInfo?._count.bookings,
    sumOfCalendars: additionalUserInfo?._count.userLevelSelectedCalendars,
    sumOfTeams: additionalUserInfo?._count.teams,
    sumOfEventTypes: additionalUserInfo?._count.eventTypes,
    sumOfTeamEventTypes,
  };
};
