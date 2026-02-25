import { AppStoreRatingRepository } from "@calcom/features/apps/repository/AppStoreRatingRepository";
import type { TAppRatingsInputSchema } from "./appRatings.schema";

interface AppRatingsOptions {
  ctx: {
    user: { id: number };
  };
  input: TAppRatingsInputSchema;
}

export const appRatingsHandler = async ({ ctx, input }: AppRatingsOptions) => {
  const { appSlug, take, skip } = input;

  const [ratings, aggregate, userRating] = await Promise.all([
    AppStoreRatingRepository.findApprovedByAppSlug({ appSlug, take, skip }),
    AppStoreRatingRepository.getAggregateByAppSlug(appSlug),
    AppStoreRatingRepository.findByUserAndApp({ userId: ctx.user.id, appSlug }),
  ]);

  return {
    ratings,
    averageRating: aggregate.averageRating,
    totalRatings: aggregate.totalRatings,
    userRating,
  };
};
