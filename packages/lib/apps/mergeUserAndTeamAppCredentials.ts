import type { TeamQuery } from "@calcom/ee/teams/teams.repository";

import getTeamAppCredentials from "./getTeamAppCredentials";
import type { Credentials } from "./getTeamAppCredentials";

const mergeUserAndTeamAppCredentials = (
  userTeams: TeamQuery[],
  userCredentialIds: Credentials,
  includeTeamInstalledApps?: boolean
) => {
  const teamAppCredentials = getTeamAppCredentials(userTeams);
  let credentials: Credentials = userCredentialIds;

  if (!includeTeamInstalledApps) {
    credentials = teamAppCredentials;
  } else {
    credentials = userCredentialIds.concat(teamAppCredentials);
  }

  return credentials;
};

export default mergeUserAndTeamAppCredentials;
