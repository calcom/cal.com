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

  async getUserFeatureStates(_input: {
    userId: number;
    featureIds: string[];
  }): Promise<Record<string, FeatureState>> {
    // Mock implementation - return inherit for all features
    const result: Record<string, FeatureState> = {};
    for (const featureId of _input.featureIds) {
      result[featureId] = "inherit";
    }
    return result;
  }

  async getTeamFeatureStates(_input: {
    teamId: number;
    featureIds: string[];
  }): Promise<Record<string, FeatureState>> {
    // Mock implementation - return inherit for all features
    const result: Record<string, FeatureState> = {};
    for (const featureId of _input.featureIds) {
      result[featureId] = "inherit";
    }
    return result;
  }

  async getFeatureStateForTeams(_input: {
    teamIds: number[];
    featureId: string;
  }): Promise<Record<number, FeatureState>> {
    // Mock implementation - return empty (all teams inherit)
    return {};
  }
}
