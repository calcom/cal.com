import { captureException } from "@sentry/nextjs";
import { injectable } from "inversify";

import db from "@calcom/prisma";

import type { IFeaturesRepository } from "./features.repository.interface";

@injectable()
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
  private async checkIfUserBelongsToTeamWithFeature(userId: number, slug: string) {
    try {
      const memberships = await db.membership.findMany({ where: { userId }, select: { teamId: true } });
      if (!memberships.length) return false;
      const teamFeature = await db.teamFeatures.findMany({
        where: {
          teamId: { in: memberships.map((m) => m.teamId) },
          featureId: slug,
        },
      });
      return teamFeature.length > 0;
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
        const userBelongsToTeamWithFeature = await this.checkIfUserBelongsToTeamWithFeature(userId, slug);
        if (userBelongsToTeamWithFeature) return true;
      }
      return false;
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
