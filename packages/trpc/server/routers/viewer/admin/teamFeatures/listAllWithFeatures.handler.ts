import type { TeamFeatures } from "@calcom/features/flags/config";
import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TListAllWithFeaturesInputSchema } from "./listAllWithFeatures.schema";

type ListAllWithFeaturesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListAllWithFeaturesInputSchema;
};

export const listAllWithFeaturesHandler = async ({ ctx, input }: ListAllWithFeaturesOptions) => {
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
        features: {
          select: {
            featureId: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.team.count({ where }),
  ]);

  const teamsWithFeatures = teams.map((team) => {
    const features: TeamFeatures = {} as TeamFeatures;

    const allFeatureKeys = [
      "calendar-cache",
      "calendar-cache-serve",
      "emails",
      "insights",
      "teams",
      "webhooks",
      "workflows",
      "organizations",
      "email-verification",
      "google-workspace-directory",
      "disable-signup",
      "attributes",
      "organizer-request-email-v2",
      "delegation-credential",
      "salesforce-crm-tasker",
      "workflow-smtp-emails",
      "cal-video-log-in-overlay",
      "use-api-v2-for-team-slots",
      "pbac",
      "restriction-schedule",
    ] as const;

    allFeatureKeys.forEach((key) => {
      features[key] = false;
    });

    team.features.forEach((teamFeature) => {
      if (teamFeature.featureId in features) {
        features[teamFeature.featureId as keyof TeamFeatures] = true;
      }
    });

    return {
      ...team,
      features,
    };
  });

  return {
    teams: teamsWithFeatures,
    totalCount,
  };
};

export default listAllWithFeaturesHandler;
