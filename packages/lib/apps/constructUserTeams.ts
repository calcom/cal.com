import type { TeamQuery } from "@calcom/ee/teams/teams.repository";
import { MembershipRole } from "@calcom/prisma/enums";

import type { Credentials } from "./getTeamAppCredentials";

const constructUserTeams = async (credentials: Credentials, appSlug: string, userTeams: TeamQuery[]) => {
  const teams = await Promise.all(
    credentials
      .filter((c) => c.appId === appSlug && c.teamId)
      .map(async (c) => {
        const team = userTeams.find((team) => team.id === c.teamId);
        if (!team) {
          return null;
        }

        return {
          teamId: team.id,
          name: team.name,
          logoUrl: team.logoUrl,
          credentialId: c.id,
          isAdmin:
            team.members[0].role === MembershipRole.ADMIN || team.members[0].role === MembershipRole.OWNER,
        };
      })
  );

  return teams;
};

export default constructUserTeams;
