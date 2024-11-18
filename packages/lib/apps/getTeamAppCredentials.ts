import type { Prisma } from "@prisma/client";

import type { TeamQuery } from "@calcom/ee/teams/teams.repository";

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
  return userTeams.flatMap((teamApp) => {
    return teamApp.credentials ? teamApp.credentials.flat() : [];
  });
};

export default getTeamAppCredentials;
