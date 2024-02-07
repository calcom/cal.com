import { CAL_URL } from "../constants";
import { getBrand } from "../server/getBrand";

export const getBookerBaseUrl = async (organizationId: number | null) => {
  const orgBrand = await getBrand(organizationId);
  return orgBrand?.fullDomain ?? CAL_URL;
};

export const getTeamBookerUrl = async (team: { organizationId: number | null }) => {
  const orgBrand = await getBrand(team.organizationId);
  return orgBrand?.fullDomain ?? CAL_URL;
};
