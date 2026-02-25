import { getAppStoreRatingService } from "@calcom/features/app-store-ratings/di/AppStoreRatingService.container";

import type { TAppStoreRatingActionSchema, TAppStoreRatingsListSchema } from "./appStoreRatings.schema";

interface ListOptions {
  input: TAppStoreRatingsListSchema;
}

export const listPendingAppRatingsHandler = async ({ input }: ListOptions) => {
  const service = getAppStoreRatingService();
  return service.getPendingRatings({
    take: input.take,
    skip: input.skip,
  });
};

interface ActionOptions {
  input: TAppStoreRatingActionSchema;
}

export const approveAppRatingHandler = async ({ input }: ActionOptions) => {
  const service = getAppStoreRatingService();
  return service.approveRating(input.id);
};

export const rejectAppRatingHandler = async ({ input }: ActionOptions) => {
  const service = getAppStoreRatingService();
  return service.rejectRating(input.id);
};
