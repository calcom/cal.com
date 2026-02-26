import type { FeatureId, FeatureState } from "./config";
import type { IFeaturesRepository } from "./features.repository.interface";

export class MockFeaturesRepository implements IFeaturesRepository {
  async checkIfUserHasFeature(_userId: number, slug: string) {
    return slug === "mock-feature";
  }

  async getUserFeaturesStatus(_userId: number, slugs: string[]): Promise<Record<string, boolean>> {
    return Object.fromEntries(slugs.map((slug) => [slug, slug === "mock-feature"]));
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
    _input:
      | {
          userId: number;
          featureId: FeatureId;
          state: "enabled" | "disabled";
          assignedBy: string;
        }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  async setTeamFeatureState(
    _input:
      | {
          teamId: number;
          featureId: FeatureId;
          state: "enabled" | "disabled";
          assignedBy: string;
        }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
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

  async getUserAutoOptIn(_userId: number): Promise<boolean> {
    // Mock implementation - default to false
    return false;
  }

  async getTeamsAutoOptIn(_teamIds: number[]): Promise<Record<number, boolean>> {
    // Mock implementation - return empty (all teams default to false)
    return {};
  }

  async setUserAutoOptIn(_userId: number, _enabled: boolean): Promise<void> {
    // Mock implementation - do nothing
  }

  async setTeamAutoOptIn(_teamId: number, _enabled: boolean): Promise<void> {
    // Mock implementation - do nothing
  }
}
