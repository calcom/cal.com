import { prisma } from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "../../../types";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const getSMSLockStateTeamsUsers = async ({ ctx }: GetOptions) => {
  const userSelect = {
    id: true,
    smsLockState: true,
    email: true,
    username: true,
    name: true,
    avatarUrl: true,
  };

  const teamSelect = {
    id: true,
    smsLockState: true,
    slug: true,
    name: true,
    logoUrl: true,
  };

  const lockedUsers = await prisma.user.findMany({
    where: {
      smsLockState: SMSLockState.LOCKED,
    },
    select: userSelect,
  });
  const reviewNeededUsers = await prisma.user.findMany({
    where: {
      smsLockState: SMSLockState.REVIEW_NEEDED,
    },
    select: userSelect,
  });

  const lockedTeams = await prisma.team.findMany({
    where: {
      smsLockState: SMSLockState.LOCKED,
    },
    select: teamSelect,
  });

  const reviewNeededTeams = await prisma.team.findMany({
    where: {
      smsLockState: SMSLockState.REVIEW_NEEDED,
    },
    select: teamSelect,
  });

  const resultObj = {
    users: {
      locked: lockedUsers,
      reviewNeeded: reviewNeededUsers,
    },
    teams: {
      locked: lockedTeams,
      reviewNeeded: reviewNeededTeams,
    },
  };

  return resultObj;
};

export default getSMSLockStateTeamsUsers;
