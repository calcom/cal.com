import type { Prisma, PrismaClient } from "@calcom/prisma/client";

import { getParsedTeam } from "../../../../../lib/server/repository/teamUtils";

export async function adminFindTeamById(prisma: PrismaClient, id: number) {
  const team = await prisma.team.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      metadata: true,
      isOrganization: true,
      parentId: true,
      members: {
        where: {
          role: "OWNER",
        },
        select: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });
  if (!team) {
    throw new Error("Team not found");
  }
  return getParsedTeam(team);
}

export async function adminFindAllTeams(
  prisma: PrismaClient,
  {
    limit,
    offset,
    searchTerm,
    filters,
  }: {
    limit: number;
    offset: number;
    searchTerm?: string;
    filters?: Array<{ id: string; value: string | string[] | boolean }>;
  }
) {
  const where: Prisma.TeamWhereInput = {
    // Exclude organizations from the team list
    isOrganization: false,
  };

  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { slug: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Apply filters
  if (filters && filters.length > 0) {
    filters.forEach((filter) => {
      if (filter.id === "hasParent") {
        where.parentId = filter.value === true ? { not: null } : null;
      }
    });
  }

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        metadata: true,
        isOrganization: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        members: {
          where: {
            role: "OWNER",
          },
          select: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.team.count({ where }),
  ]);

  return {
    rows: teams.map((team) => getParsedTeam(team)),
    meta: {
      totalRowCount: total,
    },
  };
}
