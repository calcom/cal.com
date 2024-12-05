import type { IFeaturesRepository } from "./features.repository.interface";

export class MockFeaturesRepository implements IFeaturesRepository {
  async checkIfUserHasFeature(userId: number, slug: string) {
    return slug === "mock-feature";
  }
  async checkIfFeatureIsEnabledGlobally() {
    return true;
  }
}
