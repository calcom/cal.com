import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";

import type { FeatureState } from "../types";

/**
 * Repository class for managing feature opt-in data access.
 * Handles UserFeatures, TeamFeatures records, and auto opt-in preferences.
 */
export class FeatureOptInRepository {
  constructor(private prismaClient: PrismaClient) {}

  /**
   * Gets the user feature record for a specific user and feature.
   * @param userId - The ID of the user
   * @param featureId - The feature identifier
   * @returns Promise<UserFeatures | null>
   */
  async getUserFeature(userId: number, featureId: string) {
    return this.prismaClient.userFeatures.findFirst({
      where: {
        userId,
        featureId,
      },
    });
  }

  /**
   * Gets the team feature record for a specific team and feature.
   * @param teamId - The ID of the team
   * @param featureId - The feature identifier
   * @returns Promise<TeamFeatures | null>
   */
  async getTeamFeature(teamId: number, featureId: string) {
    return this.prismaClient.teamFeatures.findFirst({
      where: {
        teamId,
        featureId,
      },
    });
  }

  /**
   * Sets the enabled status of a feature for a specific user.
   * Uses tri-state semantics:
   * - "enabled" → upsert with enabled=true
   * - "disabled" → upsert with enabled=false
   * - "inherit" → delete row (inherit from team/org level)
   * @param userId - The ID of the user
   * @param featureId - The feature identifier
   * @param state - The feature state: "enabled", "disabled", or "inherit"
   * @param assignedBy - The user or what assigned the feature
   * @returns Promise<void>
   * @throws Error if the operation fails
   */
  async setUserFeatureEnabled(
    userId: number,
    featureId: string,
    state: FeatureState,
    assignedBy: string
  ): Promise<void> {
    try {
      if (state === "inherit") {
        // Delete the row to inherit from team/org level
        await this.prismaClient.userFeatures.deleteMany({
          where: {
            userId,
            featureId,
          },
        });
      } else {
        // Create or update the row with the explicit enabled state
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
            assignedBy,
          },
          update: {
            enabled,
            assignedBy,
          },
        });
      }
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Sets the enabled status of a feature for a specific team.
   * Uses tri-state semantics:
   * - "enabled" → upsert with enabled=true
   * - "disabled" → upsert with enabled=false (blocks inheritance for users)
   * - "inherit" → delete row (inherit from org level)
   * @param teamId - The ID of the team
   * @param featureId - The feature identifier
   * @param state - The feature state: "enabled", "disabled", or "inherit"
   * @param assignedBy - The user or what assigned the feature
   * @returns Promise<void>
   * @throws Error if the operation fails
   */
  async setTeamFeatureEnabled(
    teamId: number,
    featureId: string,
    state: FeatureState,
    assignedBy: string
  ): Promise<void> {
    try {
      if (state === "inherit") {
        // Delete the row to inherit from org level
        await this.prismaClient.teamFeatures.deleteMany({
          where: {
            teamId,
            featureId,
          },
        });
      } else {
        // Create or update the row with the explicit enabled state
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
            assignedBy,
          },
          update: {
            enabled,
            assignedBy,
          },
        });
      }
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Gets all user features for a specific user.
   * @param userId - The ID of the user
   * @returns Promise<UserFeatures[]>
   */
  async getUserFeatures(userId: number) {
    return this.prismaClient.userFeatures.findMany({
      where: { userId },
      include: {
        feature: {
          select: {
            slug: true,
            enabled: true,
            description: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Gets all team features for a specific team.
   * @param teamId - The ID of the team
   * @returns Promise<TeamFeatures[]>
   */
  async getTeamFeaturesWithDetails(teamId: number) {
    return this.prismaClient.teamFeatures.findMany({
      where: { teamId },
      include: {
        feature: {
          select: {
            slug: true,
            enabled: true,
            description: true,
            type: true,
          },
        },
      },
    });
  }

  /**
   * Checks if a team has explicitly disabled a feature (enabled=false).
   * This is different from not having the feature (no row = inherit).
   * Used to determine if a team is blocking a feature for its users.
   * @param teamId - The ID of the team to check
   * @param featureId - The feature identifier to check
   * @returns Promise<boolean> - True if the team has explicitly disabled the feature
   */
  async checkIfTeamHasExplicitlyDisabledFeature(teamId: number, featureId: string): Promise<boolean> {
    try {
      const teamFeature = await this.prismaClient.teamFeatures.findUnique({
        where: {
          teamId_featureId: {
            teamId,
            featureId,
          },
        },
      });
      // Return true only if row exists AND enabled=false
      return teamFeature !== null && teamFeature.enabled === false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Gets the auto opt-in preference for a user.
   * @param userId - The ID of the user
   * @returns Promise<boolean> - True if the user has auto opt-in enabled
   */
  async getUserAutoOptInPreference(userId: number): Promise<boolean> {
    try {
      const user = await this.prismaClient.user.findUnique({
        where: { id: userId },
        select: { autoOptInExperimentalFeatures: true },
      });
      return user?.autoOptInExperimentalFeatures ?? false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Sets the auto opt-in preference for a user.
   * @param userId - The ID of the user
   * @param autoOptIn - Whether to enable auto opt-in
   * @returns Promise<void>
   */
  async setUserAutoOptInPreference(userId: number, autoOptIn: boolean): Promise<void> {
    try {
      await this.prismaClient.user.update({
        where: { id: userId },
        data: { autoOptInExperimentalFeatures: autoOptIn },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Gets the auto opt-in preference for a team.
   * @param teamId - The ID of the team
   * @returns Promise<boolean> - True if the team has auto opt-in enabled
   */
  async getTeamAutoOptInPreference(teamId: number): Promise<boolean> {
    try {
      const team = await this.prismaClient.team.findUnique({
        where: { id: teamId },
        select: { autoOptInExperimentalFeatures: true },
      });
      return team?.autoOptInExperimentalFeatures ?? false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Sets the auto opt-in preference for a team.
   * @param teamId - The ID of the team
   * @param autoOptIn - Whether to enable auto opt-in
   * @returns Promise<void>
   */
  async setTeamAutoOptInPreference(teamId: number, autoOptIn: boolean): Promise<void> {
    try {
      await this.prismaClient.team.update({
        where: { id: teamId },
        data: { autoOptInExperimentalFeatures: autoOptIn },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a user or any of their teams has autoOptInExperimentalFeatures enabled.
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if user or any of their teams has auto opt-in enabled
   */
  async checkIfUserOrTeamHasAutoOptIn(userId: number): Promise<boolean> {
    try {
      // Check user's own preference
      const user = await this.prismaClient.user.findUnique({
        where: { id: userId },
        select: { autoOptInExperimentalFeatures: true },
      });
      if (user?.autoOptInExperimentalFeatures) return true;

      // Check if any of user's teams have auto opt-in enabled
      const teamsWithAutoOptIn = await this.prismaClient.membership.findFirst({
        where: {
          userId,
          accepted: true,
          team: {
            autoOptInExperimentalFeatures: true,
          },
        },
      });

      return teamsWithAutoOptIn !== null;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
