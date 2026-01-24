import type { FeatureState } from "@calcom/features/flags/config";
import { describe, expect, it } from "vitest";
import type { OptInFeaturePolicy } from "../types";
import { computeEffectiveStateAcrossTeams } from "./computeEffectiveState";

/**
 * Feature Opt-In Effective State Computation
 * ==========================================
 *
 * This module computes whether a feature is effectively enabled for a user
 * based on global, organization, team, and user-level settings.
 *
 * Two policies are supported:
 * - `permissive` (default): User opt-in can activate the feature; disables only win if ALL teams disable
 * - `strict`: User opt-in alone is NOT enough; requires explicit enable from org/team; ANY disable blocks
 *
 *
 * SCENARIO TABLE - PERMISSIVE POLICY
 * ============================================
 *
 * | # | Global | Org      | Teams                    | User     | Result  | Reason                        |
 * |---|--------|----------|--------------------------|----------|---------|-------------------------------|
 * | 1 | true   | inherit  | [inherit, inherit]       | enabled  | ALLOWED | User opt-in activates         |
 * | 2 | true   | inherit  | [enabled, inherit]       | inherit  | ALLOWED | Team enablement propagates    |
 * | 3 | true   | inherit  | [inherit, inherit]       | inherit  | BLOCKED | No explicit enablement        |
 * | 4 | true   | inherit  | [enabled, disabled]      | inherit  | ALLOWED | At least one team enabled     |
 * | 5 | true   | enabled  | [inherit]                | inherit  | ALLOWED | Org enablement propagates     |
 * | 6 | true   | enabled  | [disabled, disabled]     | enabled  | BLOCKED | All teams disabled            |
 * | 7 | true   | disabled | [enabled]                | enabled  | BLOCKED | Org disabled blocks all       |
 * | 8 | true   | inherit  | [disabled]               | enabled  | BLOCKED | All teams disabled            |
 * | 9 | true   | inherit  | [enabled]                | disabled | BLOCKED | User disabled                 |
 * |10 | false  | enabled  | [enabled]                | enabled  | BLOCKED | Global disabled               |
 *
 *
 * SCENARIO TABLE - STRICT POLICY
 * ==============================
 *
 * | # | Global | Org      | Teams                    | User     | Result  | Reason                        |
 * |---|--------|----------|--------------------------|----------|---------|-------------------------------|
 * | 1 | true   | inherit  | [inherit, inherit]       | inherit  | BLOCKED | No explicit enablement        |
 * | 2 | true   | inherit  | [inherit, inherit]       | enabled  | BLOCKED | User-only not allowed         |
 * | 3 | true   | inherit  | [enabled, inherit]       | inherit  | ALLOWED | Team enablement works         |
 * | 4 | true   | inherit  | [enabled, inherit]       | enabled  | ALLOWED | Team + user enabled           |
 * | 5 | true   | inherit  | [enabled, disabled]      | enabled  | BLOCKED | Any team disabled blocks      |
 * | 6 | true   | enabled  | [inherit]                | inherit  | ALLOWED | Org enablement works          |
 * | 7 | true   | enabled  | [disabled]               | enabled  | BLOCKED | Any team disabled blocks      |
 * | 8 | true   | disabled | [enabled]                | enabled  | BLOCKED | Org disabled blocks all       |
 * | 9 | true   | inherit  | [enabled]                | disabled | BLOCKED | User disabled                 |
 * |10 | false  | enabled  | [enabled]                | enabled  | BLOCKED | Global disabled               |
 *
 *
 * KEY DIFFERENCES BETWEEN POLICIES
 * ================================
 *
 * | Aspect                      | Permissive                    | Strict                           |
 * |-----------------------------|-------------------------------|----------------------------------|
 * | User opt-in alone           | Can activate feature          | NOT enough, needs org/team       |
 * | Team disable behavior       | Only blocks if ALL disabled   | ANY disable blocks               |
 * | Org/team enablement needed  | No (user can self-enable)     | Yes (required for activation)    |
 *
 */

describe("computeEffectiveStateAcrossTeams", () => {
  describe("Global Kill Switch", () => {
    it.each([
      {
        policy: "permissive" as OptInFeaturePolicy,
        orgState: "enabled" as FeatureState,
        teamStates: ["enabled"] as FeatureState[],
        userState: "enabled" as FeatureState,
      },
      {
        policy: "strict" as OptInFeaturePolicy,
        orgState: "enabled" as FeatureState,
        teamStates: ["enabled"] as FeatureState[],
        userState: "enabled" as FeatureState,
      },
    ])("blocks feature when global is disabled (policy: $policy)", ({
      policy,
      orgState,
      teamStates,
      userState,
    }) => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: false,
          orgState,
          teamStates,
          userState,
          policy,
        })
      ).toEqual({ enabled: false, reason: "feature_global_disabled" });
    });
  });

  describe("Organization Level Blocking", () => {
    it.each([
      {
        policy: "permissive" as OptInFeaturePolicy,
        teamStates: ["enabled"] as FeatureState[],
        userState: "enabled" as FeatureState,
      },
      {
        policy: "strict" as OptInFeaturePolicy,
        teamStates: ["enabled"] as FeatureState[],
        userState: "enabled" as FeatureState,
      },
    ])("blocks feature when org is disabled (policy: $policy)", ({ policy, teamStates, userState }) => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "disabled",
          teamStates,
          userState,
          policy,
        })
      ).toEqual({ enabled: false, reason: "feature_org_disabled" });
    });
  });

  describe("Permissive Policy", () => {
    describe("User Opt-In Behavior", () => {
      it("allows user to self-enable even when org and teams only inherit", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["inherit", "inherit"],
            userState: "enabled",
            policy: "permissive",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("blocks when no explicit enablement exists anywhere", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["inherit", "inherit"],
            userState: "inherit",
            policy: "permissive",
          })
        ).toEqual({ enabled: false, reason: "feature_no_explicit_enablement" });
      });
    });

    describe("Team Enablement Propagation", () => {
      it("allows feature when at least one team is enabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled", "inherit", "inherit"],
            userState: "inherit",
            policy: "permissive",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("allows feature when one team enabled and another disabled (mixed)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled", "disabled", "inherit"],
            userState: "inherit",
            policy: "permissive",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });
    });

    describe("Team Disable Behavior (ALL must disable)", () => {
      it("blocks only when ALL teams have explicitly disabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["disabled", "disabled"],
            userState: "enabled",
            policy: "permissive",
          })
        ).toEqual({ enabled: false, reason: "feature_all_teams_disabled" });
      });

      it("blocks when single team is disabled (user in one team)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["disabled"],
            userState: "enabled",
            policy: "permissive",
          })
        ).toEqual({ enabled: false, reason: "feature_all_teams_disabled" });
      });
    });

    describe("Organization Enablement", () => {
      it("allows feature when org is enabled and teams inherit", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["inherit"],
            userState: "inherit",
            policy: "permissive",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("blocks when org enabled but all teams disabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["disabled", "disabled"],
            userState: "enabled",
            policy: "permissive",
          })
        ).toEqual({ enabled: false, reason: "feature_all_teams_disabled" });
      });
    });

    describe("User Disable Behavior", () => {
      it("blocks when user explicitly disables (even with team enabled)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled"],
            userState: "disabled",
            policy: "permissive",
          })
        ).toEqual({ enabled: false, reason: "feature_user_disabled" });
      });
    });

    describe("No Teams Scenario", () => {
      it("allows when org enabled and user inherits (no teams)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: [],
            userState: "inherit",
            policy: "permissive",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("allows when user self-enables (no teams, org inherits)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: [],
            userState: "enabled",
            policy: "permissive",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("blocks when no enablement anywhere (no teams)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: [],
            userState: "inherit",
            policy: "permissive",
          })
        ).toEqual({ enabled: false, reason: "feature_no_explicit_enablement" });
      });
    });
  });

  describe("Strict Policy", () => {
    describe("User Opt-In Alone NOT Sufficient", () => {
      it("blocks when user enables but no org/team enablement exists", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["inherit", "inherit"],
            userState: "enabled",
            policy: "strict",
          })
        ).toEqual({ enabled: false, reason: "feature_user_only_not_allowed" });
      });

      it("blocks when no explicit enablement exists anywhere", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["inherit", "inherit"],
            userState: "inherit",
            policy: "strict",
          })
        ).toEqual({ enabled: false, reason: "feature_no_explicit_enablement" });
      });
    });

    describe("Team Enablement Required", () => {
      it("allows when team is enabled and user inherits", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled", "inherit", "inherit"],
            userState: "inherit",
            policy: "strict",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("allows when team is enabled and user also enables", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled", "inherit", "inherit"],
            userState: "enabled",
            policy: "strict",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });
    });

    describe("ANY Team Disable Blocks", () => {
      it("blocks when any team is disabled (even if another is enabled)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled", "disabled", "inherit"],
            userState: "enabled",
            policy: "strict",
          })
        ).toEqual({ enabled: false, reason: "feature_any_team_disabled" });
      });

      it("blocks when single team is disabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["disabled"],
            userState: "enabled",
            policy: "strict",
          })
        ).toEqual({ enabled: false, reason: "feature_any_team_disabled" });
      });

      it("blocks when org enabled but any team disabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["disabled"],
            userState: "enabled",
            policy: "strict",
          })
        ).toEqual({ enabled: false, reason: "feature_any_team_disabled" });
      });
    });

    describe("Organization Enablement", () => {
      it("allows when org is enabled and teams inherit", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["inherit"],
            userState: "inherit",
            policy: "strict",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });
    });

    describe("User Disable Behavior", () => {
      it("blocks when user explicitly disables (even with team enabled)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled"],
            userState: "disabled",
            policy: "strict",
          })
        ).toEqual({ enabled: false, reason: "feature_user_disabled" });
      });
    });

    describe("No Teams Scenario", () => {
      it("allows when org enabled (no teams)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: [],
            userState: "inherit",
            policy: "strict",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("blocks when user self-enables but no org enablement (no teams)", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: [],
            userState: "enabled",
            policy: "strict",
          })
        ).toEqual({ enabled: false, reason: "feature_user_only_not_allowed" });
      });
    });
  });

  describe("Permissive Policy Additional Cases", () => {
    it("allows user to self-enable with single inheriting team", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["inherit"],
          userState: "enabled",
          policy: "permissive",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });
    });

    it("allows feature with mixed team states (one enabled, one disabled)", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["enabled", "disabled"],
          userState: "inherit",
          policy: "permissive",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });
    });
  });

  describe("Policy Comparison (same inputs, different outcomes)", () => {
    it("user-only enablement: allowed in permissive, blocked in strict", () => {
      const input = {
        globalEnabled: true,
        orgState: "inherit" as FeatureState,
        teamStates: ["inherit", "inherit"] as FeatureState[],
        userState: "enabled" as FeatureState,
      };

      expect(computeEffectiveStateAcrossTeams({ ...input, policy: "permissive" })).toEqual({
        enabled: true,
        reason: "feature_enabled",
      });

      expect(computeEffectiveStateAcrossTeams({ ...input, policy: "strict" })).toEqual({
        enabled: false,
        reason: "feature_user_only_not_allowed",
      });
    });

    it("mixed team states: allowed in permissive, blocked in strict", () => {
      const input = {
        globalEnabled: true,
        orgState: "inherit" as FeatureState,
        teamStates: ["enabled", "disabled"] as FeatureState[],
        userState: "enabled" as FeatureState,
      };

      expect(computeEffectiveStateAcrossTeams({ ...input, policy: "permissive" })).toEqual({
        enabled: true,
        reason: "feature_enabled",
      });

      expect(computeEffectiveStateAcrossTeams({ ...input, policy: "strict" })).toEqual({
        enabled: false,
        reason: "feature_any_team_disabled",
      });
    });
  });
});
