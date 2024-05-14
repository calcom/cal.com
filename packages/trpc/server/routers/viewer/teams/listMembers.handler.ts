import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TListMembersInputSchema } from "./listMembers.schema";

type ListMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TListMembersInputSchema;
};

export const listMembersHandler = async ({ ctx, input }: ListMembersOptions) => {
  const { prisma } = ctx;
  const { isOrgAdmin } = ctx.user.organization;
  const hasPermsToView = !ctx.user.organization.isPrivate || isOrgAdmin;

  if (!hasPermsToView) {
    return [];
  }

  const teams = await prisma.team.findMany({
    where: {
      id: {
        in: input.teamIds,
      },
      members: {
        some: {
          user: {
            id: ctx.user.id,
          },
          accepted: true,
        },
      },
    },
    select: {
      members: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          accepted: true,
        },
      },
    },
  });

  type UserMap = Record<number, (typeof teams)[number]["members"][number]["user"] & { accepted: boolean }>;
  // flatten users to be unique by id
  const users = teams
    .flatMap((t) => t.members)
    .reduce(
      (acc, m) => (m.user.id in acc ? acc : { ...acc, [m.user.id]: { ...m.user, accepted: m.accepted } }),
      {} as UserMap
    );

  return await Promise.all(
    Object.values(users).map(async (u) => UserRepository.enrichUserWithItsProfile({ user: u }))
  );
};

export default listMembersHandler;
