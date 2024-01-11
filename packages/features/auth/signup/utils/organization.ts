import { Profile } from "@calcom/lib/server/repository/profile";
import { prisma } from "@calcom/prisma";

export async function joinOrganization({
  organizationId,
  userId,
}: {
  userId: number;
  organizationId: number;
}) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new Error("User not found");
  }

  return await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        organizationId: organizationId,
      },
    }),
    Profile.createProfile({
      userId: userId,
      organizationId: organizationId,
      email: user.email,
      username: user.username,
    }),
  ]);
}

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
    Profile.createProfile({
      userId: userId,
      organizationId: orgId,
      email: user.email,
      username: user.username,
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
