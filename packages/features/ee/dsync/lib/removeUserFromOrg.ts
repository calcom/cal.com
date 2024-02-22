import removeMember from "@calcom/features/ee/teams/lib/removeMember";
import prisma from "@calcom/prisma";

const removeUserFromOrg = async ({ userId, orgId }: { userId: number; orgId: number }) => {
  // Find membership associated with the user and org
  const membership = await prisma.membership.delete({
    where: {
      userId_teamId: { userId, teamId: orgId },
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    throw new Error(`Could not find membership for userId ${userId} and orgId ${orgId}`);
  }

  removeMember({
    memberId: membership.id,
    teamId: orgId,
    isOrg: true,
  });
};

export default removeUserFromOrg;
