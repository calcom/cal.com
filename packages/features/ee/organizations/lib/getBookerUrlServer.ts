import { getBrand } from "@calcom/features/ee/organizations/lib/getBrand";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

export const getBookerBaseUrl = async (organizationId: number | null): Promise<string> => {
  const orgBrand = await getBrand(organizationId);
  return orgBrand?.fullDomain ?? getOrgFullOrigin(null);
};

export const getTeamBookerUrl = async (team: { organizationId: number | null }): Promise<string> => {
  const orgBrand = await getBrand(team.organizationId);
  return orgBrand?.fullDomain ?? getOrgFullOrigin(null);
};
