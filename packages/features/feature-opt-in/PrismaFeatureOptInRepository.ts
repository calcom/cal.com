import type { PrismaClient } from "@calcom/prisma";

import type { IFeatureOptInRepository } from "./FeatureOptInRepositoryInterface";

/**
 * Repository class for managing feature opt-in states for users and teams.
 * Implements tri-state semantics:
 * - Row with enabled=true → feature is enabled
 * - Row with enabled=false → feature is explicitly disabled
 * - No row → inherit from higher level
 */
export class PrismaFeatureOptInRepository implements IFeatureOptInRepository {
  constructor(private prismaClient: PrismaClient) {}

  // TODO: let's move these to features repository too
  async getUserFeatureState(input: {
    userId: number;
    featureId: string;
  }): Promise<{ enabled: boolean } | null> {
    const { userId, featureId } = input;

    const userFeature = await this.prismaClient.userFeatures.findFirst({
      where: {
        userId,
        featureId,
      },
      select: { enabled: true },
    });

    return userFeature;
  }

  async getTeamFeatureState(input: {
    teamId: number;
    featureId: string;
  }): Promise<{ enabled: boolean } | null> {
    const { teamId, featureId } = input;

    const teamFeature = await this.prismaClient.teamFeatures.findUnique({
      where: {
        teamId_featureId: {
          teamId,
          featureId,
        },
      },
      select: { enabled: true },
    });

    return teamFeature;
  }
}
