import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetTeam } from "./adminGet.schema";
import { adminFindTeamById } from "./adminUtils";

type AdminGetTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetTeam;
};

export const adminGetTeamHandler = async ({ input }: AdminGetTeamOptions) => {
  return await adminFindTeamById(prisma, input.id);
};

export default adminGetTeamHandler;
