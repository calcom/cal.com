import { getTeamWithoutMembers } from "@calcom/features/ee/teams/lib/queries";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
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
  const teamMembership = await MembershipRepository.findUniqueByUserIdAndTeamId({
    userId: ctx.user.id,
    teamId: input.teamId,
  });

  if (!teamMembership) {
    const userRepo = new UserRepository(prisma);
    const isAdminOfParentOrg = await userRepo.isAdminOfTeamOrParentOrg({
      userId: ctx.user.id,
      teamId: input.teamId,
    });

    if (!isAdminOfParentOrg) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not a member of this team.",
      });
    }
  }

  const team = await getTeamWithoutMembers({
    id: input.teamId,
    userId: ctx.user.organization?.isOrgAdmin ? undefined : ctx.user.id,
    isOrgView: input?.isOrg,
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  const membership = teamMembership
    ? {
        role: teamMembership.role,
        accepted: teamMembership.accepted,
      }
    : {
        role: "ADMIN" as const,
        accepted: true,
      };
  return { ...team, membership };
};

export default get;
