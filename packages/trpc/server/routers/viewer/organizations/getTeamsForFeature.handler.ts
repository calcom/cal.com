import { TRPCError } from "@trpc/server";

import type { PrismaClient } from "@calcom/prisma";

import type { TGetTeamsForFeatureSchema } from "./getTeamsForFeature.schema";

type GetTeamsForFeatureOptions = {
  ctx: {
    user: { id: number; organizationId: number | null };
    prisma: PrismaClient;
  };
  input: TGetTeamsForFeatureSchema;
};

export const getTeamsForFeatureHandler = async (opts: GetTeamsForFeatureOptions) => {
  const { ctx, input } = opts;
  const { prisma, user } = ctx;
  const { featureId, limit, cursor, searchTerm } = input;

  if (!user.organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be part of an organization",
    });
  }

  const where = {
    parentId: user.organizationId,
    ...(searchTerm && {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" as const } },
        { slug: { contains: searchTerm, mode: "insensitive" as const } },
      ],
    }),
  };

  const teams = await prisma.team.findMany({
    where,
    take: limit + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isOrganization: true,
      parent: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      features: {
        where: {
          featureId,
        },
        select: {
          featureId: true,
        },
      },
    },
  });

  let nextCursor: number | undefined = undefined;
  if (teams.length > limit) {
    const nextItem = teams.pop();
    nextCursor = nextItem?.id;
  }

  const teamsWithFeature = teams.map((team) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    logoUrl: team.logoUrl,
    isOrganization: team.isOrganization,
    parent: team.parent,
    hasFeature: team.features.length > 0,
  }));

  return {
    teams: teamsWithFeature,
    nextCursor,
  };
};

export default getTeamsForFeatureHandler;
