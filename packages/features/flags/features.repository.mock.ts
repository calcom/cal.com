import type { FeatureId, FeatureState } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";

export class MockFeaturesRepository implements IFeaturesRepository {
  async checkIfUserHasFeature(_userId: number, slug: string) {
    return slug === "mock-feature";
  }

  async checkIfUserHasFeatureNonHierarchical(_userId: number, slug: string) {
    return slug === "mock-feature";
  }

  async checkIfTeamHasFeature(_teamId: number, slug: FeatureId) {
    return slug === "mock-feature";
  }

  async checkIfFeatureIsEnabledGlobally(_slug: FeatureId) {
    return true;
  }

  async getTeamsWithFeatureEnabled(_slug: FeatureId): Promise<number[]> {
    return [];
  }

  async setUserFeatureState(
    _userId: number,
    _featureId: FeatureId,
    _state: FeatureState,
    _assignedBy: string
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  async setTeamFeatureState(
    _teamId: number,
    _featureId: FeatureId,
    _state: FeatureState,
    _assignedBy: string
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  async getUserFeatureStates(_input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>> {
    // Mock implementation - return inherit for all features
    const result: Record<string, FeatureState> = {};
    for (const featureId of _input.featureIds) {
      result[featureId] = "inherit";
    }
    return result;
  }

  async getTeamsFeatureStates(_input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>> {
    // Mock implementation - return empty (all teams inherit)
    return {};
  }
}
