import type { PrismaClient } from "@calcom/prisma";

import type { IFeatureOptInRepository } from "./FeatureOptInRepositoryInterface";
import type { FeatureState } from "./types";

/**
 * Repository class for managing feature opt-in states for users and teams.
 * Implements tri-state semantics:
 * - Row with enabled=true → feature is enabled
 * - Row with enabled=false → feature is explicitly disabled
 * - No row → inherit from higher level
 */
export class PrismaFeatureOptInRepository implements IFeatureOptInRepository {
  constructor(private prismaClient: PrismaClient) {}

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

  async setUserFeatureState(input: {
    userId: number;
    featureId: string;
    state: FeatureState;
    assignedBy: number;
  }): Promise<void> {
    const { userId, featureId, state, assignedBy } = input;

    if (state === "inherit") {
      // Delete the row to inherit from team/org level
      await this.prismaClient.userFeatures.deleteMany({
        where: {
          userId,
          featureId,
        },
      });
    } else {
      // Upsert with enabled = true or false
      const enabled = state === "enabled";
      await this.prismaClient.userFeatures.upsert({
        where: {
          userId_featureId: {
            userId,
            featureId,
          },
        },
        create: {
          userId,
          featureId,
          enabled,
          assignedBy: String(assignedBy),
        },
        update: {
          enabled,
          assignedBy: String(assignedBy),
        },
      });
    }
  }

  async setTeamFeatureState(input: {
    teamId: number;
    featureId: string;
    state: FeatureState;
    assignedBy: number;
  }): Promise<void> {
    const { teamId, featureId, state, assignedBy } = input;

    if (state === "inherit") {
      // Delete the row to inherit from org level
      await this.prismaClient.teamFeatures.deleteMany({
        where: {
          teamId,
          featureId,
        },
      });
    } else {
      // Upsert with enabled = true or false
      const enabled = state === "enabled";
      await this.prismaClient.teamFeatures.upsert({
        where: {
          teamId_featureId: {
            teamId,
            featureId,
          },
        },
        create: {
          teamId,
          featureId,
          enabled,
          assignedBy: String(assignedBy),
        },
        update: {
          enabled,
          assignedBy: String(assignedBy),
        },
      });
    }
  }

  async getAllUserFeatureStates(input: {
    userId: number;
  }): Promise<Array<{ featureId: string; enabled: boolean }>> {
    const { userId } = input;

    const userFeatures = await this.prismaClient.userFeatures.findMany({
      where: { userId },
      select: {
        featureId: true,
        enabled: true,
      },
    });

    return userFeatures;
  }

  async getAllTeamFeatureStates(input: {
    teamId: number;
  }): Promise<Array<{ featureId: string; enabled: boolean }>> {
    const { teamId } = input;

    const teamFeatures = await this.prismaClient.teamFeatures.findMany({
      where: { teamId },
      select: {
        featureId: true,
        enabled: true,
      },
    });

    return teamFeatures;
  }
}
