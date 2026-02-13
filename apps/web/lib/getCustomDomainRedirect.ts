import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

export function buildCustomDomainRedirect({
  customDomainFromRequest,
  verifiedCustomDomain,
  path,
  search,
}: {
  customDomainFromRequest: string | null;
  verifiedCustomDomain: string | null | undefined;
  path: string;
  search?: string;
}): { redirect: { permanent: true; destination: string } } | null {
  if (customDomainFromRequest) return null;
  if (!verifiedCustomDomain) return null;

  const origin = getOrgFullOrigin(verifiedCustomDomain, { isCustomDomain: true });
  const qs = search || "";
  return {
    redirect: {
      permanent: true,
      destination: `${origin}${path}${qs}`,
    },
  };
}
