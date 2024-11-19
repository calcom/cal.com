import type { AppFlags } from "flags/config";

import type { IFeaturesRepository } from "./features.repository.interface";

export class MockFeaturesRepository implements IFeaturesRepository {
  async checkIfUserHasFeature(userId: number, slug: string) {
    return slug === "mock-feature";
  }
  async checkIfFeatureIsEnabledGlobally(slug: keyof AppFlags) {
    return true;
  }
}
