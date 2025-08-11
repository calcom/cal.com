import { getTeamWithoutMembers } from "@calcom/lib/server/queries/teams";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetDataOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const get = async ({ ctx, input }: GetDataOptions) => {
  const teamMembership = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId: ctx.user.id,
        teamId: input.teamId,
      },
    },
    select: {
      role: true,
      accepted: true,
    },
  });

  if (!teamMembership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not a member of this team.",
    });
  }

  const userRepository = new UserRepository();
  const canBypassUserFiltering = await userRepository.isAdminOfTeamOrParentOrg({
    userId: ctx.user.id,
    teamId: input.teamId,
  });

  const team = await getTeamWithoutMembers({
    id: input.teamId,
    userId: canBypassUserFiltering ? undefined : ctx.user.id,
    isOrgView: input?.isOrg,
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  const membership = {
    role: teamMembership.role,
    accepted: teamMembership.accepted,
  };
  return { ...team, membership };
};

export default get;
