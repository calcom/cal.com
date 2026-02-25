import { AppStoreRatingRepository } from "@calcom/features/apps/repository/AppStoreRatingRepository";
import type { TSubmitAppRatingInputSchema } from "./submitAppRating.schema";

interface SubmitAppRatingOptions {
  ctx: {
    user: { id: number };
  };
  input: TSubmitAppRatingInputSchema;
}

export const submitAppRatingHandler = async ({ ctx, input }: SubmitAppRatingOptions) => {
  const { appSlug, rating, comment } = input;

  const result = await AppStoreRatingRepository.upsert({
    userId: ctx.user.id,
    appSlug,
    rating,
    comment,
  });

  return result;
};
