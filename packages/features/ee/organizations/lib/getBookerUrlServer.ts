import { getBrand } from "@calcom/features/ee/organizations/lib/getBrand";
import { WEBSITE_URL } from "@calcom/lib/constants";

export const getBookerBaseUrl = async (organizationId: number | null) => {
  const orgBrand = await getBrand(organizationId);
  return orgBrand?.fullDomain ?? WEBSITE_URL;
};

export const getTeamBookerUrl = async (team: { organizationId: number | null }) => {
  const orgBrand = await getBrand(team.organizationId);
  return orgBrand?.fullDomain ?? WEBSITE_URL;
};
