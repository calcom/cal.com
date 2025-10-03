import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminDeleteTeam } from "./adminDelete.schema";

type AdminDeleteTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminDeleteTeam;
};

export const adminDeleteTeamHandler = async ({ input }: AdminDeleteTeamOptions) => {
  return await prisma.team.delete({
    where: {
      id: input.id,
    },
  });
};

export default adminDeleteTeamHandler;
