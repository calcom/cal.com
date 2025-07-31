import { TeamService } from "@calcom/lib/server/service/teamService";

const removeUserFromOrg = async ({ userId, orgId }: { userId: number; orgId: number }) => {
  return TeamService.removeMembers({ teamIds: [orgId], memberIds: [userId], isOrg: true });
};

export default removeUserFromOrg;
