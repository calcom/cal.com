import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { Session } from "next-auth";

type MyStatsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const myStatsHandler = async ({ ctx }: MyStatsOptions) => {
  const { user: sessionUser } = ctx;

  const additionalUserInfo = await new UserRepository(prisma).getUserStats({ userId: sessionUser.id });

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
