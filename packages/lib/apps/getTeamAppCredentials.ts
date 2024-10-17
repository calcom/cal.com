import type { Prisma } from "@prisma/client";

import type { TeamQuery } from "@calcom/ee/teams/teams.repository";
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

const getTeamAppCredentials = (userTeams: TeamQuery[]) => {
  const teamAppCredentials: CredentialPayload[] = userTeams.flatMap((teamApp) => {
    return teamApp.credentials ? teamApp.credentials.flat() : [];
  });

  return teamAppCredentials;
};

export default getTeamAppCredentials;
