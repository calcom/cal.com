import { PrismaOrganizationRepository } from "@calcom/lib/server/repository/organization";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGet } from "./adminGet.schema";

type AdminGetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGet;
};

export const adminGetHandler = async ({ input }: AdminGetOptions) => {
  return await PrismaOrganizationRepository.adminFindById({ id: input.id });
};

export default adminGetHandler;
