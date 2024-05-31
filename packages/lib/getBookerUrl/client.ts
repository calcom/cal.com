import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";

export const getBookerBaseUrlSync = (
  orgSlug: string | null,
  options?: {
    protocol: boolean;
  }
) => {
  return getOrgFullOrigin(orgSlug ?? "", options);
};

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
