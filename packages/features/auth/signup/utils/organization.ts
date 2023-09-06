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
  // Join ORG
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      organizationId: orgId,
    },
  });

  /** We do a membership update twice so we can join the ORG invite if the user is invited to a team witin a ORG. */
  await prisma.membership.updateMany({
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
  });

  // Join any other invites
  await prisma.membership.updateMany({
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
  });
}
