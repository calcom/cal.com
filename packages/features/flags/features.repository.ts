import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";

import type { AppFlags } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";
import { getFeatureFlag } from "./server/utils";

/**
 * Repository class for managing feature flags and feature access control.
 * Implements the IFeaturesRepository interface to provide feature flag functionality
 * for users, teams, and global application features.
 */
export class FeaturesRepository implements IFeaturesRepository {
  /**
   * Checks if a feature is enabled globally in the application.
   * @param slug - The feature flag identifier to check
   * @returns Promise<boolean> - True if the feature is enabled globally, false otherwise
   * @throws Error if the feature flag check fails
   */
  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags) {
    try {
      return await getFeatureFlag(db, slug);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a specific user has access to a feature.
   * Checks both direct user feature assignments and team-based feature access.
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user has access to the feature, false otherwise
   * @throws Error if the feature access check fails
   */
  async checkIfUserHasFeature(userId: number, slug: string) {
    try {
      /**
       * findUnique was failing in prismock tests, so I'm using findFirst instead
       * FIXME refactor when upgrading prismock
       * https://github.com/morintd/prismock/issues/592
       */
      const userHasFeature = await db.userFeatures.findFirst({
        where: {
          userId,
          featureId: slug,
        },
      });
      if (userHasFeature) return true;
      // If the user doesn't have the feature, check if they belong to a team with the feature.
      // This also covers organizations, which are teams.
      const userBelongsToTeamWithFeature = await this.checkIfUserBelongsToTeamWithFeature(userId, slug);
      if (userBelongsToTeamWithFeature) return true;
      return false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Private helper method to check if a user belongs to any team that has access to a feature.
   * @param userId - The ID of the user to check
   * @param slug - The feature identifier to check
   * @returns Promise<boolean> - True if the user belongs to a team with the feature, false otherwise
   * @throws Error if the team feature check fails
   * @private
   */
  private async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string) {
    try {
      const user = await db.user.findUnique({
        where: {
          id: userId,
          teams: {
            some: {
              team: {
                features: {
                  some: {
                    featureId: slug,
                  },
                },
              },
            },
          },
        },
        select: { id: true },
      });
      if (user) return true;
      return false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  /**
   * Checks if a team has access to a specific feature.
   * Also checks if the team's parent organization has the feature.
   * @param teamId - The ID of the team to check
   * @param featureId - The feature identifier to check
   * @returns Promise<boolean> - True if the team has access to the feature, false otherwise
   * @throws Error if the team feature check fails
   */
  async checkIfTeamHasFeature(teamId: number, featureId: keyof AppFlags) {
    try {
      const teamFeature = await db.teamFeatures.findFirst({
        where: {
          OR: [
            { teamId, featureId },
            {
              team: {
                parent: {
                  features: {
                    some: {
                      featureId,
                    },
                  },
                },
              },
            },
          ],
        },
      });
      return !!teamFeature;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
