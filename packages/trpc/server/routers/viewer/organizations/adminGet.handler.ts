import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGet } from "./adminGet.schema";

type AdminGetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGet;
};

export const adminGetHandler = async ({ input }: AdminGetOptions) => {
  return await OrganizationRepository.adminFindById({ id: input.id });
};

export default adminGetHandler;
