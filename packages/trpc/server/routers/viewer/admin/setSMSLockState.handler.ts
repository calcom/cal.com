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

const getSMSLockStateTeamsUsers = async ({ input }: GetOptions) => {
  const { userId, username, teamId, teamSlug, lock } = input;
  if (userId) {
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
      },
    });
    return { name: updatedUser.username, lockStatus: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED };
  } else if (username) {
    const userToUpdate = await prisma.user.findFirst({
      where: {
        username,
        organizationId: null,
      },
    });
    if (userToUpdate) {
      const updatedUser = await prisma.user.update({
        where: {
          id: userToUpdate.id,
        },
        data: {
          smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
        },
      });
      return { name: updatedUser.username, lockStatus: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED };
    }
  } else if (teamId) {
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
      },
    });
    return { name: updatedTeam.slug, lockStatus: lock };
  } else if (teamSlug) {
    const teamToUpdate = await prisma.team.findFirst({
      where: {
        slug: teamSlug,
        parentId: null,
      },
    });
    if (teamToUpdate) {
      const updatedTeam = await prisma.team.update({
        where: {
          id: teamToUpdate.id,
        },
        data: {
          smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
        },
      });
      return { name: updatedTeam.slug, lockStatus: lock };
    }
  }
};

export default getSMSLockStateTeamsUsers;
