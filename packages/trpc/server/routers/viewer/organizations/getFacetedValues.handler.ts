import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getFacetedValuesHandler = async ({ ctx }: DeleteOptions) => {
  const { user } = ctx;

  const organizationId = user.organization?.id;

  if (!organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }
  const [teams, attributes] = await Promise.all([
    prisma.team.findMany({
      where: {
        parentId: organizationId,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.attribute.findMany({
      where: { teamId: organizationId },
      select: {
        id: true,
        name: true,
        options: {
          select: {
            value: true,
          },
          distinct: "value",
        },
      },
    }),
  ]);

  return {
    teams: teams,
    attributes: attributes,
    roles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
  };
};

export default getFacetedValuesHandler;
