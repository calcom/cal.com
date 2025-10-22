import { Prisma } from "@calcom/prisma/client";
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
  const { id, metadata, ...data } = input;

  return await prisma.team.update({
    where: {
      id,
    },
    data: {
      ...data,
      ...(metadata !== undefined && { metadata: metadata === null ? Prisma.JsonNull : metadata }),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      metadata: true,
    },
  });
};

export default adminUpdateTeamHandler;
