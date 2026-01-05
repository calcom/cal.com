import type { AppFlags, FeatureState } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";

export class MockFeaturesRepository implements IFeaturesRepository {
  async checkIfUserHasFeature(userId: number, slug: string) {
    return slug === "mock-feature";
  }

  async getUserFeaturesStatus(userId: number, slugs: string[]): Promise<Record<string, boolean>> {
    return Object.fromEntries(slugs.map((slug) => [slug, slug === "mock-feature"]));
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string) {
    return slug === "mock-feature";
  }

  async checkIfTeamHasFeature(teamId: number, slug: keyof AppFlags) {
    return slug === "mock-feature";
  }

  async checkIfFeatureIsEnabledGlobally(_slug: keyof AppFlags) {
    return true;
  }

  async getTeamsWithFeatureEnabled(_slug: keyof AppFlags): Promise<number[]> {
    return [];
  }

  async setTeamFeatureState(
    _teamId: number,
    _featureId: keyof AppFlags,
    _state: FeatureState,
    _assignedBy: string
  ): Promise<void> {
    // Mock implementation - do nothing
  }
}
