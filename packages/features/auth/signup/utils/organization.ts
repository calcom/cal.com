import prisma from "@calcom/prisma";

export async function joinOrganization({
  organizationId,
  userId,
}: {
  userId: number;
  organizationId: number;
}) {
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      organizationId: organizationId,
    },
  });
}

export async function joinAnyChildTeamOnOrgInvite({ userId, orgId }: { userId: number; orgId: number }) {
  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        organizationId: orgId,
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
