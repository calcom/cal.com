import { organizationRepository } from "@calcom/features/ee/organizations/repositories";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGet } from "./adminGet.schema";

type AdminGetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGet;
};

export const adminGetHandler = async ({ input }: AdminGetOptions) => {
  return await organizationRepository.adminFindById({ id: input.id });
};

export default adminGetHandler;
