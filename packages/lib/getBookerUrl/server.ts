import { WEBSITE_URL } from "../constants";
import { getBrand } from "../server/getBrand";

export const getBookerBaseUrl = async (user: { organizationId: number | null }) => {
  const orgBrand = await getBrand(user.organizationId);
  return orgBrand?.fullDomain ?? WEBSITE_URL;
};

export const getTeamBookerUrl = async (team: { organizationId: number | null }) => {
  const orgBrand = await getBrand(team.organizationId);
  return orgBrand?.fullDomain ?? WEBSITE_URL;
};
