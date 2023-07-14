import { WEBAPP_URL } from "../constants";
import { getBrand } from "./getBrand";

export const getBookerUrl = async (user: { organizationId: number | null }) => {
  const orgBrand = await getBrand(user.organizationId);
  return orgBrand?.fullDomain ?? WEBAPP_URL;
};
