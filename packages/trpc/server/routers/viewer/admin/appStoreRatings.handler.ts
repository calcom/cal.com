import { AppStoreRatingRepository } from "@calcom/features/apps/repository/AppStoreRatingRepository";
import type { TAppStoreRatingActionSchema, TAppStoreRatingsListSchema } from "./appStoreRatings.schema";

interface ListOptions {
  input: TAppStoreRatingsListSchema;
}

export const listPendingAppRatingsHandler = async ({ input }: ListOptions) => {
  return AppStoreRatingRepository.findPendingPaginated({
    take: input.take,
    skip: input.skip,
  });
};

interface ActionOptions {
  input: TAppStoreRatingActionSchema;
}

export const approveAppRatingHandler = async ({ input }: ActionOptions) => {
  return AppStoreRatingRepository.approve(input.id);
};

export const rejectAppRatingHandler = async ({ input }: ActionOptions) => {
  return AppStoreRatingRepository.delete(input.id);
};
