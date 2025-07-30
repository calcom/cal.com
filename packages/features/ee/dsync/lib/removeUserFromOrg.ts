import removeMember from "@calcom/features/ee/teams/lib/removeMember";

const removeUserFromOrg = async ({ userId, orgId }: { userId: number; orgId: number }) => {
  // TODO: Shouldn't we call TeamService.removeMembers instead, which also updates billing too?
  return removeMember({
    memberId: userId,
    teamId: orgId,
    isOrg: true,
  });
};

export default removeUserFromOrg;
