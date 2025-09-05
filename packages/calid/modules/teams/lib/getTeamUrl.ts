import { WEBSITE_URL } from "@calcom/lib/constants";

export const getTeamUrl = (teamSlug: string): string => {
  return `${WEBSITE_URL}/team/${teamSlug}`;
};
