import { TeamService } from "@calcom/lib/server/service/teamService";

const removeUserFromOrg = async ({ userId, orgId }: { userId: number; orgId: number }) => {
  return TeamService.removeMembers({ teamIds: [orgId], userIds: [userId], isOrg: true });
};

export default removeUserFromOrg;
