import type { FeatureId, FeatureState } from "@calcom/features/flags/config";

import type { EffectiveStateReason } from "../lib/computeEffectiveState";
import type { OptInFeatureScope } from "../types";

export type { EffectiveStateReason };

export type ResolvedFeatureState = {
  featureId: FeatureId;
  globalEnabled: boolean;
  orgState: FeatureState;
  teamStates: FeatureState[];
  userState: FeatureState | undefined;
  effectiveEnabled: boolean;
  effectiveReason: EffectiveStateReason;
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
  listFeaturesForUser(input: {
    userId: number;
    orgId: number | null;
    teamIds: number[];
  }): Promise<ResolvedFeatureState[]>;
  listFeaturesForTeam(input: {
    teamId: number;
    parentOrgId?: number | null;
    scope?: OptInFeatureScope;
  }): Promise<
    { featureId: FeatureId; globalEnabled: boolean; teamState: FeatureState; orgState: FeatureState }[]
  >;
  setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: number }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void>;
  setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: number; scope?: OptInFeatureScope }
      | { teamId: number; featureId: FeatureId; state: "inherit"; scope?: OptInFeatureScope }
  ): Promise<void>;
}
