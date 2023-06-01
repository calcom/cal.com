import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateTeamsSchema } from "./createTeams.schema";

type CreateTeamsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateTeamsSchema;
};

export const createTeamsHandler = async ({ ctx, input }: CreateTeamsOptions) => {
  const { teamNames, orgId } = input;

  const userMembership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: orgId,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  // TODO test this check works
  if (!userMembership || userMembership.role !== MembershipRole.OWNER)
    throw new TRPCError({ code: "BAD_REQUEST", message: "not_authorized" });

  await prisma.team.createMany({
    data: teamNames.map((name) => ({ name, parentId: orgId, slug: slugify(name) })),
  });
};
