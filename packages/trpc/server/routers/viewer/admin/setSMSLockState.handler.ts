import { prisma } from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
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
    const userToUpdate = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToUpdate) throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
        smsLockReviewedByAdmin: true,
      },
    });
    return { name: updatedUser.username, locked: lock };
  } else if (username) {
    const userToUpdate = await prisma.user.findFirst({
      where: {
        username,
        profiles: { none: {} },
      },
    });
    if (!userToUpdate) throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
    const updatedUser = await prisma.user.update({
      where: {
        id: userToUpdate.id,
      },
      data: {
        smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
        smsLockReviewedByAdmin: true,
      },
    });
    return { name: updatedUser.username, locked: lock };
  } else if (teamId) {
    const teamToUpdate = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
    if (!teamToUpdate) throw new TRPCError({ code: "BAD_REQUEST", message: "Team not found" });
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
        smsLockReviewedByAdmin: true,
      },
    });
    return { name: updatedTeam.slug, locked: lock };
  } else if (teamSlug) {
    const teamToUpdate = await prisma.team.findFirst({
      where: {
        slug: teamSlug,
        parentId: null,
      },
    });
    if (!teamToUpdate) throw new TRPCError({ code: "BAD_REQUEST", message: "Team not found" });
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamToUpdate.id,
      },
      data: {
        smsLockState: lock ? SMSLockState.LOCKED : SMSLockState.UNLOCKED,
        smsLockReviewedByAdmin: true,
      },
    });
    return { name: updatedTeam.slug, locked: lock };
  }
  throw new TRPCError({ code: "BAD_REQUEST", message: "Input data missing" });
};

export default setSMSLockState;
