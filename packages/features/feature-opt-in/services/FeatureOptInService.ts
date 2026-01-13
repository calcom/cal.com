import type { FeatureId, FeatureState } from "@calcom/features/flags/config";
import type { FeaturesRepository } from "@calcom/features/flags/features.repository";

import type { OptInFeaturePolicy } from "../types";
import { getOptInFeatureConfig, OPT_IN_FEATURES } from "../config";
import { applyAutoOptIn } from "../lib/applyAutoOptIn";
import { computeEffectiveStateAcrossTeams } from "../lib/computeEffectiveState";
import type { EffectiveStateReason, IFeatureOptInService, ResolvedFeatureState } from "./IFeatureOptInService";

type ListFeaturesForUserResult = {
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

type ListFeaturesForTeamResult = {
  featureId: FeatureId;
  globalEnabled: boolean;
  teamState: FeatureState;
  orgState: FeatureState;
};

function getOrgState(orgId: number | null, teamStatesById: Record<number, FeatureState>): FeatureState {
  if (orgId !== null) {
    return teamStatesById[orgId] ?? "inherit";
  }
  return "inherit";
}

function getOrgAutoOptIn(orgId: number | null, teamsAutoOptIn: Record<number, boolean>): boolean {
  if (orgId !== null) {
    return teamsAutoOptIn[orgId] ?? false;
  }
  return false;
}

function getTeamIdsToQuery(teamId: number, parentOrgId: number | null | undefined): number[] {
  if (parentOrgId) {
    return [teamId, parentOrgId];
  }
  return [teamId];
}

function getOrgStateForTeam(
  parentOrgId: number | null | undefined,
  teamStates: Record<string, Record<number, FeatureState>>,
  slug: FeatureId
): FeatureState {
  if (parentOrgId) {
    return teamStates[slug]?.[parentOrgId] ?? "inherit";
  }
  return "inherit";
}

/**
 * Service class for managing feature opt-in logic.
 * Computes effective states based on global, org, team, and user settings.
 */
export class FeatureOptInService implements IFeatureOptInService {
  constructor(private featuresRepository: FeaturesRepository) {}

  /**
   * Core method: Resolve feature states for a user across all their teams.
   *
   * Precedence rules:
   * 1. Global disabled → false (stop)
   * 2. Org explicitly disabled → false (stop)
   * 3. Org explicitly enabled → allowed at org level, continue to teams
   * 4. Org inherits (or no org) → check teams
   * 5. All teams explicitly disabled → false (stop)
   * 6. At least one team enabled OR inherits → allowed at team level, continue to user
   * 7. User explicitly disabled → false
   * 8. User explicitly enabled OR inherits → true
   *
   * Auto-opt-in transformation:
   * - If autoOptInFeatures=true at a level AND state is "inherit", transform to "enabled"
   * - This transformation happens before computing effectiveEnabled
   */
  async resolveFeatureStatesAcrossTeams({
    userId,
    orgId,
    teamIds,
    featureIds,
  }: {
    userId: number;
    orgId: number | null;
    teamIds: number[];
    featureIds: FeatureId[];
  }): Promise<Record<string, ResolvedFeatureState>> {
    const allTeamIds = orgId !== null ? [orgId, ...teamIds] : teamIds;

    const [allFeatures, allTeamStates, userStates, userAutoOptIn, teamsAutoOptIn] = await Promise.all([
      this.featuresRepository.getAllFeatures(),
      this.featuresRepository.getTeamsFeatureStates({ teamIds: allTeamIds, featureIds }),
      this.featuresRepository.getUserFeatureStates({ userId, featureIds }),
      this.featuresRepository.getUserAutoOptIn(userId),
      this.featuresRepository.getTeamsAutoOptIn(allTeamIds),
    ]);

    const globalEnabledMap = new Map(allFeatures.map((feature) => [feature.slug, feature.enabled ?? false]));
    const resolvedStates: Record<string, ResolvedFeatureState> = {};

    for (const featureId of featureIds) {
      const state = this.resolveFeatureState(
        featureId,
        orgId,
        teamIds,
        globalEnabledMap,
        allTeamStates,
        userStates,
        teamsAutoOptIn,
        userAutoOptIn
      );
      resolvedStates[featureId] = state;
    }

    return resolvedStates;
  }

  private resolveFeatureState(
    featureId: FeatureId,
    orgId: number | null,
    teamIds: number[],
    globalEnabledMap: Map<string, boolean>,
    allTeamStates: Record<string, Record<number, FeatureState>>,
    userStates: Record<string, FeatureState>,
    teamsAutoOptIn: Record<number, boolean>,
    userAutoOptIn: boolean
  ): ResolvedFeatureState {
    const globalEnabled = globalEnabledMap.get(featureId) ?? false;
    const teamStatesById = allTeamStates[featureId] ?? {};

    const orgState = getOrgState(orgId, teamStatesById);
    const teamStates = teamIds.map((teamId) => teamStatesById[teamId] ?? "inherit");
    const userState = userStates[featureId] ?? "inherit";
    const orgAutoOptIn = getOrgAutoOptIn(orgId, teamsAutoOptIn);
    const teamAutoOptIns = teamIds.map((teamId) => teamsAutoOptIn[teamId] ?? false);

    const { effectiveOrgState, effectiveTeamStates, effectiveUserState } = applyAutoOptIn({
      orgState,
      teamStates,
      userState,
      orgAutoOptIn,
      teamAutoOptIns,
      userAutoOptIn,
    });

    // Get the policy for this feature from the config
    const featureConfig = getOptInFeatureConfig(featureId);
    const policy: OptInFeaturePolicy = featureConfig?.policy ?? "permissive";

    const { enabled: effectiveEnabled, reason: effectiveReason } = computeEffectiveStateAcrossTeams({
      globalEnabled,
      orgState: effectiveOrgState,
      teamStates: effectiveTeamStates,
      userState: effectiveUserState,
      policy,
    });

    return {
      featureId,
      globalEnabled,
      orgState,
      teamStates,
      userState,
      effectiveEnabled,
      effectiveReason,
      orgAutoOptIn,
      teamAutoOptIns,
      userAutoOptIn,
    };
  }

  /**
   * List all opt-in features with their states for a user across teams.
   * Only returns features that are in the allowlist and globally enabled.
   */
  async listFeaturesForUser(input: {
    userId: number;
    orgId: number | null;
    teamIds: number[];
  }): Promise<ListFeaturesForUserResult[]> {
    const { userId, orgId, teamIds } = input;
    const featureIds = OPT_IN_FEATURES.map((config) => config.slug);

    const resolvedStates = await this.resolveFeatureStatesAcrossTeams({
      userId,
      orgId,
      teamIds,
      featureIds,
    });

    return featureIds.map((featureId) => resolvedStates[featureId]).filter((state) => state.globalEnabled);
  }

  /**
   * List all opt-in features with their raw states for a team.
   * Used for team admin settings page to configure feature opt-in.
   * Only returns features that are in the allowlist and globally enabled.
   * If parentOrgId is provided, also returns the organization state for each feature.
   */
  async listFeaturesForTeam(input: {
    teamId: number;
    parentOrgId?: number | null;
  }): Promise<ListFeaturesForTeamResult[]> {
    const { teamId, parentOrgId } = input;
    const teamIdsToQuery = getTeamIdsToQuery(teamId, parentOrgId);

    const [allFeatures, teamStates] = await Promise.all([
      this.featuresRepository.getAllFeatures(),
      this.featuresRepository.getTeamsFeatureStates({
        teamIds: teamIdsToQuery,
        featureIds: OPT_IN_FEATURES.map((config) => config.slug),
      }),
    ]);

    const results = OPT_IN_FEATURES.map((config) => {
      const globalFeature = allFeatures.find((f) => f.slug === config.slug);
      const globalEnabled = globalFeature?.enabled ?? false;
      const teamState = teamStates[config.slug]?.[teamId] ?? "inherit";
      const orgState = getOrgStateForTeam(parentOrgId, teamStates, config.slug);

      return { featureId: config.slug, globalEnabled, teamState, orgState };
    });

    return results.filter((result) => result.globalEnabled);
  }

  /**
   * Set user's feature state.
   * Delegates to FeaturesRepository.setUserFeatureState.
   */
  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: number }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    const { userId, featureId, state } = input;
    if (state === "inherit") {
      await this.featuresRepository.setUserFeatureState({ userId, featureId, state });
    } else {
      const { assignedBy } = input;
      await this.featuresRepository.setUserFeatureState({
        userId,
        featureId,
        state,
        assignedBy: `user-${assignedBy}`,
      });
    }
  }

  /**
   * Set team's feature state.
   * Delegates to FeaturesRepository.setTeamFeatureState.
   */
  async setTeamFeatureState(
    input:
      | { teamId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: number }
      | { teamId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    const { teamId, featureId, state } = input;
    if (state === "inherit") {
      await this.featuresRepository.setTeamFeatureState({ teamId, featureId, state });
    } else {
      const { assignedBy } = input;
      await this.featuresRepository.setTeamFeatureState({
        teamId,
        featureId,
        state,
        assignedBy: `user-${assignedBy}`,
      });
    }
  }
}
