import { injectable } from "inversify";

import type { IFeaturesRepository } from "./features.repository.interface";

@injectable()
export class MockFeaturesRepository implements IFeaturesRepository {
  async checkIfUserHasFeature(userId: number, slug: string) {
    return slug === "mock-feature";
  }
}
