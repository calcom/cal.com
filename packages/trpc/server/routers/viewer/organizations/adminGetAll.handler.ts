import { TeamRepository } from "@calcom/lib/server/repository/team";

import type { TrpcSessionUser } from "../../../trpc";

type AdminGetAllOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const adminGetUnverifiedHandler = async ({}: AdminGetAllOptions) => {
  return await TeamRepository.getAllOrgs();
};

export default adminGetUnverifiedHandler;
