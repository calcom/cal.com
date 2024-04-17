import { prisma } from "@calcom/prisma";
import { SmsLockState } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../trpc";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const getSMSLockStatusTeamsUsers = async ({ ctx }: GetOptions) => {
  const userSelect = {
    id: true,
    smsLockStatus: true,
    email: true,
    username: true,
    name: true,
  };

  const teamSelect = {
    id: true,
    smsLockStatus: true,
    slug: true,
    name: true,
  };

  const lockedUsers = await prisma.user.findMany({
    where: {
      smsLockStatus: SmsLockState.LOCKED,
    },
    select: userSelect,
  });
  const reviewNeededUsers = await prisma.user.findMany({
    where: {
      smsLockStatus: SmsLockState.REVIEW_NEEDED,
    },
    select: userSelect,
  });

  const lockedTeams = await prisma.team.findMany({
    where: {
      smsLockStatus: SmsLockState.LOCKED,
    },
    select: teamSelect,
  });

  const reviewNeededTeams = await prisma.team.findMany({
    where: {
      smsLockStatus: SmsLockState.REVIEW_NEEDED,
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

export default getSMSLockStatusTeamsUsers;
