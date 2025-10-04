import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetAllTeamsInput } from "./adminGetAll.schema";
import { adminFindAllTeams } from "./adminUtils";

type AdminGetAllTeamsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetAllTeamsInput;
};

export const adminGetAllTeamsHandler = async ({ input }: AdminGetAllTeamsOptions) => {
  return await adminFindAllTeams(prisma, {
    limit: input.limit,
    offset: input.offset,
    searchTerm: input.searchTerm,
    filters: input.filters,
  });
};

export default adminGetAllTeamsHandler;
