import prisma from "@calcom/prisma";
import { SMSLockState } from "@calcom/prisma/enums";

export async function isLockedForSMSSending(userId?: number | null, teamId?: number | null) {
  if (userId) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    return user?.smsLockState === SMSLockState.LOCKED;
  }
  if (teamId) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
      },
    });
    return team?.smsLockState === SMSLockState.LOCKED;
  }
}
