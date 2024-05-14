import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type InputOptions = {
  ctx: {
    user: { id: NonNullable<TrpcSessionUser>["id"] };
  };
  input: {
    memberId: number;
  };
};

export async function hasEditPermissionForUserID({ ctx, input }: InputOptions) {
  const { user } = ctx;

  const authedUsersTeams = await prisma.membership.findMany({
    where: {
      userId: user.id,
      accepted: true,
      role: {
        in: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  const targetUsersTeams = await prisma.membership.findMany({
    where: {
      userId: input.memberId,
      accepted: true,
    },
  });

  const teamIdOverlaps = authedUsersTeams.some((authedTeam) => {
    return targetUsersTeams.some((targetTeam) => targetTeam.teamId === authedTeam.teamId);
  });

  return teamIdOverlaps;
}

export async function hasReadPermissionsForUserId({ ctx, input }: InputOptions) {
  const { user } = ctx;

  const authedUsersTeams = await prisma.membership.findMany({
    where: {
      userId: user.id,
      accepted: true,
    },
  });

  const targetUsersTeams = await prisma.membership.findMany({
    where: {
      userId: input.memberId,
      accepted: true,
    },
  });

  const teamIdOverlaps = authedUsersTeams.some((authedTeam) => {
    return targetUsersTeams.some((targetTeam) => targetTeam.teamId === authedTeam.teamId);
  });

  return teamIdOverlaps;
}
