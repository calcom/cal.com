import { prisma } from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../trpc";
import type { TSetSMSLockState } from "./setSMSLockState.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetSMSLockState;
};

const getSMSLockStateTeamsUsers = async ({ ctx, input }: GetOptions) => {
  const { userId, teamId, lock } = input;
  if (userId) {
    const updateUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
      },
    });
    return { name: updateUser.username, lockStatus: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED };
  } else if (teamId) {
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
      },
    });
    console.log("change here");
    return { name: updatedTeam.slug, lockStatus: lock };
  }
};

export default getSMSLockStateTeamsUsers;
