import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminUpdateTeam } from "./adminUpdate.schema";

type AdminUpdateTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminUpdateTeam;
};

export const adminUpdateTeamHandler = async ({ input }: AdminUpdateTeamOptions) => {
  const { id, ...data } = input;

  return await prisma.team.update({
    where: {
      id,
    },
    data,
  });
};

export default adminUpdateTeamHandler;
