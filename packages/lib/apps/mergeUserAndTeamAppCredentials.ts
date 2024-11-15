import type { TeamQuery } from "@calcom/ee/teams/teams.repository";

import getTeamAppCredentials from "./getTeamAppCredentials";
import type { Credentials } from "./getTeamAppCredentials";

const mergeUserAndTeamAppCredentials = (
  userTeams: TeamQuery[],
  userCredentialIds: Credentials,
  includeTeamInstalledApps?: boolean
) => {
  const teamAppCredentials = getTeamAppCredentials(userTeams);

  if (!includeTeamInstalledApps) {
    return teamAppCredentials;
  }

  return userCredentialIds.concat(teamAppCredentials);
};

export default mergeUserAndTeamAppCredentials;
