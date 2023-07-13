import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";

type AdminGetUnverifiedOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const adminGetUnverifiedHandler = async ({ ctx }: AdminGetUnverifiedOptions) => {
  const unVerifiedTeams = await prisma.team.findMany({
    where: {
      AND: [
        {
          metadata: {
            path: ["isOrganization"],
            equals: true,
          },
        },
        {
          metadata: {
            path: ["isOrganizationVerified"],
            equals: false,
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      members: {
        where: {
          role: "OWNER",
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return unVerifiedTeams;
};
