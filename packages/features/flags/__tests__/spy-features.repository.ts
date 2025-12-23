import type { Feature } from "@calcom/prisma/client";

import type { FeatureId, FeatureState } from "../config";
import type { IFeaturesRepository } from "../features.repository.interface";

/**
 * Mock FeaturesRepository that tracks all method calls.
 * Useful for testing caching behavior and verifying repository interactions.
 */
export class SpyFeaturesRepository implements IFeaturesRepository {
  getAllFeaturesCalls = 0;
  checkIfFeatureIsEnabledGloballyCalls: FeatureId[] = [];
  getTeamsWithFeatureEnabledCalls: FeatureId[] = [];
  checkIfUserHasFeatureCalls: Array<{ userId: number; slug: string }> = [];
  checkIfUserHasFeatureNonHierarchicalCalls: Array<{ userId: number; slug: string }> = [];
  getUserFeatureStatesCalls: Array<{ userId: number; featureIds: FeatureId[] }> = [];
  getUserAutoOptInCalls: number[] = [];
  checkIfTeamHasFeatureCalls: Array<{ teamId: number; slug: FeatureId }> = [];
  getTeamsFeatureStatesCalls: Array<{ teamIds: number[]; featureIds: FeatureId[] }> = [];
  getTeamsAutoOptInCalls: number[][] = [];
  setUserFeatureStateCalls: Array<{
    userId: number;
    featureId: FeatureId;
    state: FeatureState;
    assignedBy?: string;
  }> = [];
  setTeamFeatureStateCalls: Array<{
    teamId: number;
    featureId: FeatureId;
    state: FeatureState;
    assignedBy?: string;
  }> = [];
  setUserAutoOptInCalls: Array<{ userId: number; enabled: boolean }> = [];
  setTeamAutoOptInCalls: Array<{ teamId: number; enabled: boolean }> = [];

  mockAllFeatures: Feature[] = [];
  mockGlobalFeatureEnabled: Record<string, boolean> = {};
  mockTeamsWithFeature: Record<string, number[]> = {};
  mockUserHasFeature: Record<string, boolean> = {};
  mockUserHasFeatureNonHierarchical: Record<string, boolean> = {};
  mockUserFeatureStates: Record<number, Record<string, FeatureState>> = {};
  mockUserAutoOptIn: Record<number, boolean> = {};
  mockTeamHasFeature: Record<string, boolean> = {};
  mockTeamsFeatureStates: Record<string, Record<number, FeatureState>> = {};
  mockTeamsAutoOptIn: Record<number, boolean> = {};

  async getAllFeatures(): Promise<Feature[]> {
    this.getAllFeaturesCalls++;
    return this.mockAllFeatures;
  }

  async checkIfFeatureIsEnabledGlobally(slug: FeatureId): Promise<boolean> {
    this.checkIfFeatureIsEnabledGloballyCalls.push(slug);
    return this.mockGlobalFeatureEnabled[slug] ?? false;
  }

  async getTeamsWithFeatureEnabled(slug: FeatureId): Promise<number[]> {
    this.getTeamsWithFeatureEnabledCalls.push(slug);
    return this.mockTeamsWithFeature[slug] ?? [];
  }

  async checkIfUserHasFeature(userId: number, slug: string): Promise<boolean> {
    this.checkIfUserHasFeatureCalls.push({ userId, slug });
    return this.mockUserHasFeature[`${userId}:${slug}`] ?? false;
  }

  async checkIfUserHasFeatureNonHierarchical(userId: number, slug: string): Promise<boolean> {
    this.checkIfUserHasFeatureNonHierarchicalCalls.push({ userId, slug });
    return this.mockUserHasFeatureNonHierarchical[`${userId}:${slug}`] ?? false;
  }

  async getUserFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, FeatureState>> {
    this.getUserFeatureStatesCalls.push(input);
    const userStates = this.mockUserFeatureStates[input.userId] ?? {};
    const result: Record<string, FeatureState> = {};
    for (const featureId of input.featureIds) {
      result[featureId] = userStates[featureId] ?? "inherit";
    }
    return result;
  }

  async getUserAutoOptIn(userId: number): Promise<boolean> {
    this.getUserAutoOptInCalls.push(userId);
    return this.mockUserAutoOptIn[userId] ?? false;
  }

  async checkIfTeamHasFeature(teamId: number, slug: FeatureId): Promise<boolean> {
    this.checkIfTeamHasFeatureCalls.push({ teamId, slug });
    return this.mockTeamHasFeature[`${teamId}:${slug}`] ?? false;
  }

  async getTeamsFeatureStates(input: {
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, Record<number, FeatureState>>> {
    this.getTeamsFeatureStatesCalls.push(input);
    const result: Record<string, Record<number, FeatureState>> = {};
    for (const featureId of input.featureIds) {
      result[featureId] = {};
      const featureStates = this.mockTeamsFeatureStates[featureId] ?? {};
      for (const teamId of input.teamIds) {
        if (featureStates[teamId] !== undefined) {
          result[featureId][teamId] = featureStates[teamId];
        }
      }
    }
    return result;
  }

  async getTeamsAutoOptIn(teamIds: number[]): Promise<Record<number, boolean>> {
    this.getTeamsAutoOptInCalls.push(teamIds);
    const result: Record<number, boolean> = {};
    for (const teamId of teamIds) {
      if (this.mockTeamsAutoOptIn[teamId] !== undefined) {
        result[teamId] = this.mockTeamsAutoOptIn[teamId];
      }
    }
    return result;
  }

  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    this.setUserFeatureStateCalls.push({
      userId: input.userId,
      featureId: input.featureId,
      state: input.state,
      assignedBy: "assignedBy" in input ? input.assignedBy : undefined,
    });
  }

  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: string }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    this.setTeamFeatureStateCalls.push({
      teamId: input.teamId,
      featureId: input.featureId,
      state: input.state,
      assignedBy: "assignedBy" in input ? input.assignedBy : undefined,
    });
  }

  async setUserAutoOptIn(userId: number, enabled: boolean): Promise<void> {
    this.setUserAutoOptInCalls.push({ userId, enabled });
  }

  async setTeamAutoOptIn(teamId: number, enabled: boolean): Promise<void> {
    this.setTeamAutoOptInCalls.push({ teamId, enabled });
  }

  reset(): void {
    this.getAllFeaturesCalls = 0;
    this.checkIfFeatureIsEnabledGloballyCalls = [];
    this.getTeamsWithFeatureEnabledCalls = [];
    this.checkIfUserHasFeatureCalls = [];
    this.checkIfUserHasFeatureNonHierarchicalCalls = [];
    this.getUserFeatureStatesCalls = [];
    this.getUserAutoOptInCalls = [];
    this.checkIfTeamHasFeatureCalls = [];
    this.getTeamsFeatureStatesCalls = [];
    this.getTeamsAutoOptInCalls = [];
    this.setUserFeatureStateCalls = [];
    this.setTeamFeatureStateCalls = [];
    this.setUserAutoOptInCalls = [];
    this.setTeamAutoOptInCalls = [];
  }
}
