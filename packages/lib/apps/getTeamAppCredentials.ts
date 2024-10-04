import type { Prisma } from "@prisma/client";

import type { TeamQuery } from "@calcom/trpc/server/routers/loggedInViewer/integrations.handler";
import type { CredentialPayload } from "@calcom/types/Credential";

export type Credentials = {
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

const getTeamAppCredentials = (
  userTeams: TeamQuery[],
  userCredentialIds: Credentials,
  includeTeamInstalledApps?: boolean
) => {
  let credentials: Credentials = userCredentialIds;
  const teamAppCredentials: CredentialPayload[] = userTeams.flatMap((teamApp) => {
    return teamApp.credentials ? teamApp.credentials.flat() : [];
  });

  if (!includeTeamInstalledApps) {
    credentials = teamAppCredentials;
  } else {
    credentials = userCredentialIds.concat(teamAppCredentials);
  }

  return credentials;
};

export default getTeamAppCredentials;
