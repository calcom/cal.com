import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";

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
  const [users, teams, attributes] = await Promise.all([
    prisma.membership.findMany({
      where: { teamId: organizationId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      take: 1000, // Limit the number of users returned
    }),
    prisma.team.findMany({
      where: { id: organizationId },
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
    users: users.map((u) => u.user),
    teams: teams,
    attributes: attributes,
    roles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
  };
};

export default getFacetedValuesHandler;
