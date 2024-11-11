import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";

import type { IFeaturesRepository } from "./features.repository.interface";

export class FeaturesRepository implements IFeaturesRepository {
  async checkIfTeamHasFeature(teamId: number, slug: string) {
    try {
      const teamFeature = await db.teamFeatures.findUnique({
        where: {
          teamId_featureId: { teamId, featureId: slug },
        },
      });
      return !!teamFeature;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async checkIfUserHasFeature(userId: number, slug: string) {
    try {
      const userFeature = await db.userFeatures.findUnique({
        where: {
          userId_featureId: { userId, featureId: slug },
        },
      });
      return !!userFeature;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async checkIfTeamOrUserHasFeature(
    args: {
      teamId?: number;
      userId?: number;
    },
    slug: string
  ) {
    const { teamId, userId } = args;
    try {
      if (teamId) {
        const teamHasFeature = await this.checkIfTeamHasFeature(teamId, slug);
        if (teamHasFeature) return true;
      }
      if (userId) {
        const userHasFeature = await this.checkIfUserHasFeature(userId, slug);
        if (userHasFeature) return true;
      }
      return false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
