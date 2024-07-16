import { getBookerBaseUrlSync } from "./getBookerBaseUrlSync";

export { getBookerBaseUrlSync } from "./getBookerBaseUrlSync";
export const getTeamUrlSync = (
  {
    orgSlug,
    teamSlug,
  }: {
    orgSlug: string | null;
    teamSlug: string | null;
  },
  options?: {
    protocol: boolean;
  }
) => {
  const bookerUrl = getBookerBaseUrlSync(orgSlug, options);
  teamSlug = teamSlug || "";
  if (orgSlug) {
    return `${bookerUrl}/${teamSlug}`;
  }
  return `${bookerUrl}/team/${teamSlug}`;
};
