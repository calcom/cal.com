import type { Prisma } from "@prisma/client";

import type { TeamQuery } from "@calcom/ee/teams/teams.repository";

import getTeamAppCredentials from "./getTeamAppCredentials";

type Credentials = {
  user: {
    email: string;
  } | null;
  id: number;
  userId: number | null;
  type: string;
  key: Prisma.JsonValue;
  teamId: number | null;
  appId: string | null;
  invalid: boolean | null;
}[];

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
