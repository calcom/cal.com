import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGet } from "./adminGet.schema";

type AdminGetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGet;
};

export const adminGetHandler = async ({ input }: AdminGetOptions) => {
  return await getOrganizationRepository().adminFindById({ id: input.id });
};

export default adminGetHandler;
