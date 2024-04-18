import { prisma } from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TSetSMSLockState } from "./setSMSLockState.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetSMSLockState;
};

const setSMSLockState = async ({ input }: GetOptions) => {
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
    if (!updatedUser) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
    }
    return { name: updatedUser.username, locked: lock };
  } else if (username) {
    const userToUpdate = await prisma.user.findFirst({
      where: {
        username,
        profiles: { none: {} },
      },
    });
    if (!userToUpdate) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
    }
    if (userToUpdate) {
      const updatedUser = await prisma.user.update({
        where: {
          id: userToUpdate.id,
        },
        data: {
          smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
        },
      });
      return { name: updatedUser.username, locked: lock };
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
    if (!updatedTeam) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Team not found" });
    }
    return { name: updatedTeam.slug, locked: lock };
  } else if (teamSlug) {
    const teamToUpdate = await prisma.team.findFirst({
      where: {
        slug: teamSlug,
        parentId: null,
      },
    });
    if (!teamToUpdate) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Team not found" });
    }
    if (teamToUpdate) {
      const updatedTeam = await prisma.team.update({
        where: {
          id: teamToUpdate.id,
        },
        data: {
          smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
        },
      });
      return { name: updatedTeam.slug, locked: lock };
    }
  }
  throw new TRPCError({ code: "BAD_REQUEST", message: "Input data missing" });
};

export default setSMSLockState;
