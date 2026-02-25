import { getAppStoreRatingService } from "@calcom/features/app-store-ratings/di/AppStoreRatingService.container";

import type { TSubmitAppRatingInputSchema } from "./submitAppRating.schema";

interface SubmitAppRatingOptions {
  ctx: {
    user: { id: number };
  };
  input: TSubmitAppRatingInputSchema;
}

export const submitAppRatingHandler = async ({ ctx, input }: SubmitAppRatingOptions) => {
  const { appSlug, rating, comment } = input;
  const service = getAppStoreRatingService();

  return service.submitRating({
    userId: ctx.user.id,
    appSlug,
    rating,
    comment,
  });
};
