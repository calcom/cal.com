import type { FeatureId, FeatureState } from "@calcom/features/flags/config";

export type ResolvedFeatureState = {
  featureId: FeatureId;
  globalEnabled: boolean;
  orgState: FeatureState; // Raw state (before auto-opt-in transform)
  teamStates: FeatureState[]; // Raw states
  userState: FeatureState | undefined; // Raw state
  effectiveEnabled: boolean;
  // Auto-opt-in flags for UI to show checkbox state
  orgAutoOptIn: boolean;
  teamAutoOptIns: boolean[];
  userAutoOptIn: boolean;
};

export interface IFeatureOptInService {
  resolveFeatureStatesAcrossTeams(input: {
    userId: number;
    orgId: number | null;
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, ResolvedFeatureState>>;
  listFeaturesForUser(input: { userId: number; orgId: number | null; teamIds: number[] }): Promise<
    ResolvedFeatureState[]
  >;
  listFeaturesForTeam(
    input: { teamId: number }
  ): Promise<{ featureId: FeatureId; globalEnabled: boolean; teamState: FeatureState }[]>;
  setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: number }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void>;
  setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: number }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void>;
}
