import { TeamRepository } from "@calcom/lib/server/repository/team";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetAllTeamsInput } from "./adminGetAll.schema";

type AdminGetAllTeamsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetAllTeamsInput;
};

export const adminGetAllTeamsHandler = async ({ input }: AdminGetAllTeamsOptions) => {
  const teamRepository = new TeamRepository(prisma);

  return await teamRepository.adminFindAll({
    limit: input.limit,
    offset: input.offset,
    searchTerm: input.searchTerm,
    filters: input.filters,
  });
};

export default adminGetAllTeamsHandler;
