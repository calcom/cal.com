import { WEBAPP_URL } from "../constants";
import { getBrand } from "../server/getBrand";

export const getBookerBaseUrl = async (user: { organizationId: number | null }) => {
  const orgBrand = await getBrand(user.organizationId);
  return orgBrand?.fullDomain ?? WEBAPP_URL;
};

export const getTeamBookerUrl = async (team: { organizationId: number | null }) => {
  const orgBrand = await getBrand(team.organizationId);
  return orgBrand?.fullDomain ?? WEBAPP_URL;
};
