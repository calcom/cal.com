import { prisma } from "@calcom/prisma";
import { SmsLockState } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../trpc";
import type { TSetSMSLockState } from "./setSMSLockState.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetSMSLockState;
};

const getSMSLockStatusTeamsUsers = async ({ ctx, input }: GetOptions) => {
  const { userId, teamId, lock } = input;
  if (userId) {
    const updateUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        smsLockStatus: lock ? SmsLockState.LOCKED : SmsLockState.UNLOCKED,
      },
    });
    return { name: updateUser.username, lockStatus: lock ? SmsLockState.LOCKED : SmsLockState.UNLOCKED };
  } else if (teamId) {
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        smsLockStatus: lock ? SmsLockState.LOCKED : SmsLockState.UNLOCKED,
      },
    });
    console.log("change here");
    return { name: updatedTeam.slug, lockStatus: lock };
  }
};

export default getSMSLockStatusTeamsUsers;
