import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import type { FeatureId, FeatureState } from "@calcom/features/flags/config";
import type { IFeatureRepository } from "@calcom/features/flags/repositories/PrismaFeatureRepository";
import type { ITeamFeatureRepository } from "@calcom/features/flags/repositories/PrismaTeamFeatureRepository";
import type { IUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { TeamFeaturesDto } from "@calcom/lib/dto/TeamFeaturesDto";
import type { UserFeaturesDto } from "@calcom/lib/dto/UserFeaturesDto";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import {
  getOptInFeatureConfig,
  getOptInFeaturesForScope,
  isFeatureAllowedForScope,
  isOptInFeature,
} from "../config";
import { applyAutoOptIn } from "../lib/applyAutoOptIn";
import { computeEffectiveStateAcrossTeams } from "../lib/computeEffectiveState";
import type { OptInFeaturePolicy, OptInFeatureScope } from "../types";
import type {
  EffectiveStateReason,
  FeatureOptInEligibilityResult,
  IFeatureOptInService,
  ResolvedFeatureState,
  UserRoleContext,
} from "./IFeatureOptInService";

function teamFeatureToState(teamFeature: TeamFeaturesDto | undefined): FeatureState {
  if (!teamFeature) return "inherit";
  if (teamFeature.enabled) return "enabled";
  return "disabled";
}

function userFeatureToState(userFeature: UserFeaturesDto | undefined): FeatureState {
  if (!userFeature) return "inherit";
  if (userFeature.enabled) return "enabled";
  return "disabled";
}

interface IFeatureOptInServiceDeps {
  featureRepo: IFeatureRepository;
  teamFeatureRepo: ITeamFeatureRepository;
  userFeatureRepo: IUserFeatureRepository;
}

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

type FeatureOptInEligibilityStatus =
  | "invalid_feature"
  | "feature_disabled"
  | "already_enabled"
  | "blocked"
  | "can_opt_in";

function getOrgState(orgId: number | null, teamStatesById: Record<number, TeamFeaturesDto>): FeatureState {
  if (orgId !== null) {
    return teamFeatureToState(teamStatesById[orgId]);
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
  teamStates: Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>>,
  slug: FeatureId
): FeatureState {
  if (parentOrgId) {
    return teamFeatureToState(teamStates[slug]?.[parentOrgId]);
  }
  return "inherit";
}

/**
 * Service class for managing feature opt-in logic.
 * Computes effective states based on global, org, team, and user settings.
 */
export class FeatureOptInService implements IFeatureOptInService {
  constructor(private deps: IFeatureOptInServiceDeps) {}

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
    let allTeamIds = teamIds;
    if (orgId !== null) {
      allTeamIds = [orgId, ...teamIds];
    }

    const [allFeatures, allTeamStates, userStates, userAutoOptIn, teamsAutoOptIn] = await Promise.all([
      this.deps.featureRepo.findAll(),
      this.deps.teamFeatureRepo.findByTeamIdsAndFeatureIds(allTeamIds, featureIds),
      this.deps.userFeatureRepo.findByUserIdAndFeatureIds(userId, featureIds),
      this.deps.userFeatureRepo.findAutoOptInByUserId(userId),
      this.deps.teamFeatureRepo.findAutoOptInByTeamIds(allTeamIds),
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
    allTeamStates: Partial<Record<FeatureId, Record<number, TeamFeaturesDto>>>,
    userStates: Partial<Record<FeatureId, UserFeaturesDto>>,
    teamsAutoOptIn: Record<number, boolean>,
    userAutoOptIn: boolean
  ): ResolvedFeatureState {
    const globalEnabled = globalEnabledMap.get(featureId) ?? false;
    const teamStatesById = allTeamStates[featureId] ?? {};

    const orgState = getOrgState(orgId, teamStatesById);
    const teamStates = teamIds.map((teamId) => teamFeatureToState(teamStatesById[teamId]));
    const userState = userFeatureToState(userStates[featureId]);
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

  async resolveFeatureStates(input: {
    userId: number;
    featureIds: FeatureId[];
  }): Promise<Record<string, ResolvedFeatureState>> {
    const { userId, featureIds } = input;
    const { orgId, teamIds } = await this.getUserOrgAndTeamIds(userId);

    return this.resolveFeatureStatesAcrossTeams({
      userId,
      orgId,
      teamIds,
      featureIds,
    });
  }

  /**
   * List all opt-in features with their states for a user across teams.
   * Only returns features that are in the allowlist, globally enabled, scoped to "user",
   * and configured to be displayed in settings.
   */
  async listFeaturesForUser(input: { userId: number }): Promise<ListFeaturesForUserResult[]> {
    const { userId } = input;
    const userScopedFeatures = getOptInFeaturesForScope("user", "settings");
    const featureIds = userScopedFeatures.map((config) => config.slug);

    const resolvedStates = await this.resolveFeatureStates({
      userId,
      featureIds,
    });

    return featureIds.map((featureId) => resolvedStates[featureId]).filter((state) => state.globalEnabled);
  }

  /**
   * List all opt-in features with their raw states for a team or organization.
   * Used for team/org admin settings page to configure feature opt-in.
   * Only returns features that are in the allowlist, globally enabled, scoped to the specified scope,
   * and configured to be displayed in settings.
   * If parentOrgId is provided, also returns the organization state for each feature.
   */
  async listFeaturesForTeam(input: {
    teamId: number;
    parentOrgId?: number | null;
    scope?: OptInFeatureScope;
  }): Promise<ListFeaturesForTeamResult[]> {
    const { teamId, parentOrgId, scope = "team" } = input;
    const teamIdsToQuery = getTeamIdsToQuery(teamId, parentOrgId);
    const scopedFeatures = getOptInFeaturesForScope(scope, "settings");

    const [allFeatures, teamStates] = await Promise.all([
      this.deps.featureRepo.findAll(),
      this.deps.teamFeatureRepo.findByTeamIdsAndFeatureIds(
        teamIdsToQuery,
        scopedFeatures.map((config) => config.slug)
      ),
    ]);

    const results = scopedFeatures.map((config) => {
      const globalFeature = allFeatures.find((f) => f.slug === config.slug);
      const globalEnabled = globalFeature?.enabled ?? false;
      const teamState = teamFeatureToState(teamStates[config.slug]?.[teamId]);
      const orgState = getOrgStateForTeam(parentOrgId, teamStates, config.slug);

      return { featureId: config.slug, globalEnabled, teamState, orgState };
    });

    return results.filter((result) => result.globalEnabled);
  }

  /**
   * Check if user is eligible to see the feature opt-in banner.
   * Uses PBAC to determine user's role context (org admin, team admin permissions).
   */
  async checkFeatureOptInEligibility(input: {
    userId: number;
    featureId: string;
  }): Promise<FeatureOptInEligibilityResult> {
    const { userId, featureId } = input;

    if (!isOptInFeature(featureId)) {
      return {
        status: "invalid_feature",
        canOptIn: false,
        userRoleContext: null,
        blockingReason: null,
      };
    }

    const { orgId, teamIds } = await this.getUserOrgAndTeamIds(userId);
    const resolvedStates = await this.resolveFeatureStatesAcrossTeams({
      userId,
      orgId,
      teamIds,
      featureIds: [featureId],
    });

    const featureState = resolvedStates[featureId];
    if (!featureState) {
      return {
        status: "invalid_feature",
        canOptIn: false,
        userRoleContext: null,
        blockingReason: null,
      };
    }

    if (!featureState.globalEnabled) {
      return {
        status: "feature_disabled",
        canOptIn: false,
        userRoleContext: null,
        blockingReason: "feature_global_disabled",
      };
    }

    if (featureState.effectiveEnabled) {
      return {
        status: "already_enabled",
        canOptIn: false,
        userRoleContext: null,
        blockingReason: null,
      };
    }

    const userRoleContext = await this.getUserRoleContext(userId, orgId, teamIds);

    const blockingReasons = [
      "feature_org_disabled",
      "feature_all_teams_disabled",
      "feature_any_team_disabled",
      "feature_user_only_not_allowed",
    ];

    if (blockingReasons.includes(featureState.effectiveReason)) {
      return {
        status: "blocked",
        canOptIn: false,
        userRoleContext,
        blockingReason: featureState.effectiveReason,
      };
    }

    // Simulate what would happen if user opts in
    const featureConfig = getOptInFeatureConfig(featureId);
    if (!featureConfig) {
      return {
        status: "blocked",
        canOptIn: false,
        userRoleContext,
        blockingReason: "feature_config_not_found",
      };
    }
    const policy: OptInFeaturePolicy = featureConfig.policy ?? "permissive";

    const simulatedResult = computeEffectiveStateAcrossTeams({
      globalEnabled: featureState.globalEnabled,
      orgState: featureState.orgState,
      teamStates: featureState.teamStates,
      userState: "enabled",
      policy,
    });

    // For strict policy features, user opt-in alone won't enable the feature if org/team hasn't explicitly enabled it.
    // E.g., strict policy + org "inherit" + team "inherit" + user "enabled" → feature still not enabled.
    if (!simulatedResult.enabled) {
      return {
        status: "blocked",
        canOptIn: false,
        userRoleContext,
        blockingReason: simulatedResult.reason,
      };
    }

    return {
      status: "can_opt_in",
      canOptIn: true,
      userRoleContext,
      blockingReason: null,
    };
  }

  private async getUserOrgAndTeamIds(userId: number): Promise<{ orgId: number | null; teamIds: number[] }> {
    const membershipRepository = new MembershipRepository(prisma);
    const memberships = await membershipRepository.findAllByUserId({
      userId,
      filters: { accepted: true },
    });

    let orgId: number | null = null;
    const teamIds: number[] = [];

    for (const membership of memberships) {
      if (membership.team.isOrganization) {
        orgId = membership.teamId;
      } else {
        teamIds.push(membership.teamId);
      }
    }

    return { orgId, teamIds };
  }

  private async getUserRoleContext(
    userId: number,
    orgId: number | null,
    _teamIds: number[]
  ): Promise<UserRoleContext> {
    const permissionService = new PermissionCheckService();
    const fallbackRoles = [MembershipRole.OWNER, MembershipRole.ADMIN];

    let isOrgAdmin = false;
    if (orgId !== null) {
      isOrgAdmin = await permissionService.checkPermission({
        userId,
        teamId: orgId,
        permission: "organization.update",
        fallbackRoles,
      });
    }

    const teamRepository = new TeamRepository(prisma);
    const adminTeams = await teamRepository.findOwnedTeamsByUserId({ userId });

    const nonOrgAdminTeams = adminTeams.filter((team) => !team.isOrganization);
    const adminTeamIds = nonOrgAdminTeams.map((team) => team.id);
    const adminTeamNames = nonOrgAdminTeams.map((team) => ({ id: team.id, name: team.name }));

    return { isOrgAdmin, orgId, adminTeamIds, adminTeamNames };
  }

  /**
   * Set user's feature state.
   * Delegates to FeaturesRepository.setUserFeatureState.
   * Throws an error if the feature is not scoped to "user".
   */
  async setUserFeatureState(
    input:
      | { userId: number; featureId: FeatureId; state: "enabled" | "disabled"; assignedBy: number }
      | { userId: number; featureId: FeatureId; state: "inherit" }
  ): Promise<void> {
    const { userId, featureId, state } = input;

    if (!isFeatureAllowedForScope(featureId, "user")) {
      throw new ErrorWithCode(
        ErrorCode.BadRequest,
        `Feature "${featureId}" is not available at the user scope`
      );
    }

    if (state === "inherit") {
      await this.deps.userFeatureRepo.delete(userId, featureId);
    } else {
      const { assignedBy } = input;
      await this.deps.userFeatureRepo.upsert(userId, featureId, state === "enabled", `user-${assignedBy}`);
    }
  }

  /**
   * Set team's feature state.
   * Throws an error if the feature is not scoped to the specified scope.
   */
  async setTeamFeatureState(
    input:
      | {
          teamId: number;
          featureId: FeatureId;
          state: "enabled" | "disabled";
          assignedBy: number;
          scope?: OptInFeatureScope;
        }
      | { teamId: number; featureId: FeatureId; state: "inherit"; scope?: OptInFeatureScope }
  ): Promise<void> {
    const { teamId, featureId, state } = input;
    const scope = input.scope ?? "team";

    if (!isFeatureAllowedForScope(featureId, scope)) {
      throw new ErrorWithCode(
        ErrorCode.BadRequest,
        `Feature "${featureId}" is not available at the ${scope} scope`
      );
    }

    if (state === "inherit") {
      await this.deps.teamFeatureRepo.delete(teamId, featureId);
    } else {
      const { assignedBy } = input;
      await this.deps.teamFeatureRepo.upsert(teamId, featureId, state === "enabled", `user-${assignedBy}`);
    }
  }
}

export type { FeatureOptInEligibilityStatus };
export type { IFeatureOptInServiceDeps };
export type { FeatureOptInEligibilityResult, UserRoleContext } from "./IFeatureOptInService";
