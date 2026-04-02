import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetTeamsForFeatureSchema } from "./getTeamsForFeature.schema";

type GetTeamsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TAdminGetTeamsForFeatureSchema;
};

export const getTeamsForFeatureHandler = async ({ ctx, input }: GetTeamsOptions) => {
  const { prisma } = ctx;
  const { featureId, limit = 10, cursor, searchTerm } = input;

  const whereClause = {
    isPlatform: false,
    ...(searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" as const } },
            { slug: { contains: searchTerm, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [teams, assignedTeams] = await Promise.all([
    prisma.team.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        parentId: true,
        isOrganization: true,
        parent: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    }),
    prisma.teamFeatures.findMany({
      where: {
        featureId,
        enabled: true,
      },
      select: {
        teamId: true,
      },
    }),
  ]);

  const assignedTeamIds = new Set(assignedTeams.map((tf) => tf.teamId));

  let nextCursor: typeof cursor | undefined;
  if (teams.length > limit) {
    const nextItem = teams.pop();
    nextCursor = nextItem?.id;
  }

  return {
    teams: teams.map((team) => ({
      ...team,
      hasFeature: assignedTeamIds.has(team.id),
    })),
    nextCursor,
  };
};

export default getTeamsForFeatureHandler;
