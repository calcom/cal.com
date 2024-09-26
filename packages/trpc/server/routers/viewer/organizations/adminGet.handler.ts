import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import type { TrpcSessionUser } from "../../../trpc";
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
