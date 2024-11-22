import { captureException } from "@sentry/nextjs";

import db from "@calcom/prisma";

import type { AppFlags } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";
import { getFeatureFlag } from "./server/utils";

export class FeaturesRepository implements IFeaturesRepository {
  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags) {
    try {
      return await getFeatureFlag(db, slug);
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
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
}
