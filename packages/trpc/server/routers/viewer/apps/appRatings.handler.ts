import { getAppStoreRatingService } from "@calcom/features/app-store-ratings/di/AppStoreRatingService.container";

import type { TAppRatingsInputSchema } from "./appRatings.schema";

interface AppRatingsOptions {
  ctx: {
    user: { id: number };
  };
  input: TAppRatingsInputSchema;
}

export const appRatingsHandler = async ({ ctx, input }: AppRatingsOptions) => {
  const { appSlug, take, skip } = input;
  const service = getAppStoreRatingService();

  const [ratings, aggregate, userRating] = await Promise.all([
    service.getApprovedRatings({ appSlug, take, skip }),
    service.getAggregateRatings(appSlug),
    service.getUserRating({ userId: ctx.user.id, appSlug }),
  ]);

  return {
    ratings,
    averageRating: aggregate.averageRating,
    totalRatings: aggregate.totalRatings,
    userRating,
  };
};
