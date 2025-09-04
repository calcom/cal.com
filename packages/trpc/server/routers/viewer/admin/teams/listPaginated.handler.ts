import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TTeamsListPaginatedSchema } from "./listPaginated.schema";

type ListPaginatedOptions = {
  ctx: {
    user: TrpcSessionUser;
    prisma: PrismaClient;
  };
  input: TTeamsListPaginatedSchema;
};

export default async function handler({ ctx, input }: ListPaginatedOptions) {
  const { prisma } = ctx;
  const { limit, cursor, searchTerm } = input;

  const whereClause = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" as const } },
          { slug: { contains: searchTerm, mode: "insensitive" as const } },
        ],
      }
    : {};

  const teams = await prisma.team.findMany({
    where: whereClause,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      bannerUrl: true,
      isOrganization: true,
      createdAt: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  const totalCount = await prisma.team.count({
    where: whereClause,
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (teams.length > limit) {
    const nextItem = teams.pop();
    nextCursor = nextItem?.id;
  }

  return {
    rows: teams,
    nextCursor,
    meta: {
      totalRowCount: totalCount,
    },
  };
}
