import { CachedFeaturesRepository } from "@calcom/features/flags/features.repository.cached";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TListAllWithFeaturesInputSchema } from "./listAllWithFeatures.schema";

type ListAllWithFeaturesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListAllWithFeaturesInputSchema;
};

export const listAllWithFeaturesHandler = async ({ ctx, input }: ListAllWithFeaturesOptions) => {
  if (ctx.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const { limit, offset, searchTerm, parentId } = input;

  const where = {
    ...(searchTerm && {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" as const } },
        { slug: { contains: searchTerm, mode: "insensitive" as const } },
      ],
    }),
    ...(parentId !== undefined && { parentId }),
  };

  const [teams, totalCount] = await Promise.all([
    prisma.team.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isOrganization: true,
        platformBilling: {
          select: {
            id: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.team.count({ where }),
  ]);

  const featuresRepo = new CachedFeaturesRepository();
  const teamsWithFeatures = await Promise.all(
    teams.map(async (team) => ({
      ...team,
      features: await featuresRepo.getTeamFeatures(team.id),
    }))
  );

  return {
    teams: teamsWithFeatures,
    totalCount,
  };
};

export default listAllWithFeaturesHandler;
