import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type InputOptions = {
  ctx: {
    user: { id: NonNullable<TrpcSessionUser>["id"] };
  };
  input: {
    // memberId: number;
    calIdMemberId: number;
  };
};

export async function hasEditPermissionForUserID({ ctx, input }: InputOptions) {
  const { user } = ctx;

  // const authedUsersTeams = await prisma.membership.findMany({
  const authedUsersTeams = await prisma.calIdMembership.findMany({
    where: {
      userId: user.id,
      // accepted: true,
      acceptedInvitation: true,
      role: {
        in: [CalIdMembershipRole.ADMIN, CalIdMembershipRole.OWNER],
      },
    },
  });

  // const targetUsersTeams = await prisma.membership.findMany({
  const targetUsersTeams = await prisma.calIdMembership.findMany({
    where: {
      // userId: input.memberId,
      userId: input.calIdMemberId,
      // accepted: true,
      acceptedInvitation: true,
    },
  });

  const teamIdOverlaps = authedUsersTeams.some((authedTeam) => {
    // return targetUsersTeams.some((targetTeam) => targetTeam.teamId === authedTeam.teamId);
    return targetUsersTeams.some((targetTeam) => targetTeam.calIdTeamId === authedTeam.calIdTeamId);
  });

  return teamIdOverlaps;
}

export async function hasReadPermissionsForUserId({
  userId,
  // memberId,
  calIdMemberId,
}: InputOptions["input"] & { userId: number }) {
  // const authedUsersTeams = await prisma.membership.findMany({
  const authedUsersTeams = await prisma.calIdMembership.findMany({
    where: {
      userId,
      // accepted: true,
      acceptedInvitation: true,
    },
  });

  // const targetUsersTeams = await prisma.membership.findMany({
  const targetUsersTeams = await prisma.calIdMembership.findMany({
    where: {
      // userId: memberId,
      userId: calIdMemberId,
      // accepted: true,
      acceptedInvitation: true,
    },
  });

  const teamIdOverlaps = authedUsersTeams.some((authedTeam) => {
    // return targetUsersTeams.some((targetTeam) => targetTeam.teamId === authedTeam.teamId);
    return targetUsersTeams.some((targetTeam) => targetTeam.calIdTeamId === authedTeam.calIdTeamId);
  });

  return teamIdOverlaps;
}
