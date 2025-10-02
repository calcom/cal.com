import { TeamRepository } from "@calcom/lib/server/repository/team";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetTeam } from "./adminGet.schema";

type AdminGetTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetTeam;
};

export const adminGetTeamHandler = async ({ input }: AdminGetTeamOptions) => {
  const teamRepository = new TeamRepository(prisma);

  return await teamRepository.adminFindById({ id: input.id });
};

export default adminGetTeamHandler;
