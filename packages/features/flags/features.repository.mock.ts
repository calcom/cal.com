import type { AppFlags, FeatureState } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";

export class MockFeaturesRepository implements IFeaturesRepository {
  async checkIfUserHasFeature(_userId: number, slug: string) {
    return slug === "mock-feature";
  }

  async checkIfUserHasFeatureNonHierarchical(_userId: number, slug: string) {
    return slug === "mock-feature";
  }

  async checkIfTeamHasFeature(_teamId: number, slug: keyof AppFlags) {
    return slug === "mock-feature";
  }

  async checkIfFeatureIsEnabledGlobally(_slug: keyof AppFlags) {
    return true;
  }

  async getTeamsWithFeatureEnabled(_slug: keyof AppFlags): Promise<number[]> {
    return [];
  }

  async setUserFeatureState(
    _userId: number,
    _featureId: keyof AppFlags,
    _state: FeatureState,
    _assignedBy: string
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  async setTeamFeatureState(
    _teamId: number,
    _featureId: keyof AppFlags,
    _state: FeatureState,
    _assignedBy: string
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  async getUserFeatureState(_input: {
    userId: number;
    featureId: string;
  }): Promise<{ enabled: boolean } | null> {
    // Mock implementation - return null (inherit)
    return null;
  }

  async getTeamFeatureState(_input: {
    teamId: number;
    featureId: string;
  }): Promise<{ enabled: boolean } | null> {
    // Mock implementation - return null (inherit)
    return null;
  }
}
