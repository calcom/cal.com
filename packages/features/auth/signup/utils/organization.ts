import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { prisma } from "@calcom/prisma";

export async function joinAnyChildTeamOnOrgInvite({ userId, orgId }: { userId: number; orgId: number }) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new Error("User not found");
  }
  await prisma.$transaction([
    // Simply remove this update when we remove the `organizationId` field from the user table
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        organizationId: orgId,
      },
    }),
    prisma.profile.upsert({
      create: {
        uid: ProfileRepository.generateProfileUid(),
        userId: userId,
        organizationId: orgId,
        username: user.username || user.email.split("@")[0],
      },
      update: {
        username: user.username || user.email.split("@")[0],
      },
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    }),
    prisma.membership.updateMany({
      where: {
        userId,
        team: {
          id: orgId,
        },
        accepted: false,
      },
      data: {
        accepted: true,
      },
    }),
    prisma.membership.updateMany({
      where: {
        userId,
        team: {
          parentId: orgId,
        },
        accepted: false,
      },
      data: {
        accepted: true,
      },
    }),
  ]);
}
