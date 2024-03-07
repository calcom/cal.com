import removeMember from "@calcom/features/ee/teams/lib/removeMember";

const removeUserFromOrg = async ({ userId, orgId }: { userId: number; orgId: number }) => {
  await removeMember({
    memberId: userId,
    teamId: orgId,
    isOrg: true,
  });
};

export default removeUserFromOrg;
