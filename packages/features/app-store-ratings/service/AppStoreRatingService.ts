import type { AppStoreRatingRepository } from "../repository/AppStoreRatingRepository";

interface AppStoreRatingServiceDeps {
  appStoreRatingRepository: AppStoreRatingRepository;
}

export class AppStoreRatingService {
  private readonly appStoreRatingRepository: AppStoreRatingRepository;

  constructor(deps: AppStoreRatingServiceDeps) {
    this.appStoreRatingRepository = deps.appStoreRatingRepository;
  }

  async getApprovedRatings({
    appSlug,
    take,
    skip,
  }: {
    appSlug: string;
    take?: number;
    skip?: number;
  }) {
    return this.appStoreRatingRepository.findApprovedBySlug({ appSlug, take, skip });
  }

  async getAggregateRatings(appSlug: string) {
    return this.appStoreRatingRepository.getAggregateBySlug(appSlug);
  }

  async getUserRating({ userId, appSlug }: { userId: number; appSlug: string }) {
    return this.appStoreRatingRepository.findByUserAndSlug({ userId, appSlug });
  }

  async submitRating({
    userId,
    appSlug,
    rating,
    comment,
  }: {
    userId: number;
    appSlug: string;
    rating: number;
    comment?: string;
  }) {
    return this.appStoreRatingRepository.upsert({ userId, appSlug, rating, comment });
  }

  async getPendingRatings({ take, skip }: { take?: number; skip?: number }) {
    return this.appStoreRatingRepository.findPendingPaginated({ take, skip });
  }

  async approveRating(id: number) {
    return this.appStoreRatingRepository.approve(id);
  }

  async rejectRating(id: number) {
    return this.appStoreRatingRepository.deleteById(id);
  }
}
