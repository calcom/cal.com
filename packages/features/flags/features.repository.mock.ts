import { injectable } from "inversify";

import type { IFeaturesRepository } from "./features.repository.interface";

@injectable()
export class MockFeaturesRepository implements IFeaturesRepository {
  async checkIfTeamHasFeature(teamId: number, slug: string) {
    return slug === "mock-feature";
  }
  async checkIfUserHasFeature(userId: number, slug: string) {
    return slug === "mock-feature";
  }
  async checkIfTeamOrUserHasFeature(
    args: {
      teamId?: number;
      userId?: number;
    },
    slug: string
  ) {
    return slug === "mock-feature";
  }
}
