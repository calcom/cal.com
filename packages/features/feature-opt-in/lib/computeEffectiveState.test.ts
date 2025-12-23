import { describe, it, expect } from "vitest";

import { computeEffectiveStateAcrossTeams } from "./computeEffectiveState";

describe("computeEffectiveStateAcrossTeams", () => {
  describe("when global is disabled", () => {
    it("returns false with feature_global_disabled reason", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: false,
          orgState: "enabled",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toEqual({ enabled: false, reason: "feature_global_disabled" });
    });
  });

  describe("when org is disabled", () => {
    it("returns false with feature_org_disabled reason", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "disabled",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toEqual({ enabled: false, reason: "feature_org_disabled" });
    });
  });

  describe("when org is enabled", () => {
    describe("when all teams are disabled", () => {
      it("returns false with feature_all_teams_disabled reason", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["disabled", "disabled"],
            userState: "enabled",
          })
        ).toEqual({ enabled: false, reason: "feature_all_teams_disabled" });
      });
    });

    describe("when at least one team is enabled", () => {
      it("returns true when user is enabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["enabled", "disabled"],
            userState: "enabled",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("returns false with feature_user_disabled reason when user is disabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["enabled", "disabled"],
            userState: "disabled",
          })
        ).toEqual({ enabled: false, reason: "feature_user_disabled" });
      });

      it("returns true when user inherits", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["enabled", "disabled"],
            userState: "inherit",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });
    });

    describe("when teams inherit from enabled org", () => {
      it("returns true when user is enabled or inherits", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["inherit"],
            userState: "enabled",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });

        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["inherit"],
            userState: "inherit",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });
    });
  });

  describe("when org inherits (or no org)", () => {
    describe("when all teams are disabled", () => {
      it("returns false with feature_all_teams_disabled reason", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["disabled"],
            userState: "enabled",
          })
        ).toEqual({ enabled: false, reason: "feature_all_teams_disabled" });
      });
    });

    describe("when at least one team is enabled", () => {
      it("returns true when user is enabled or inherits", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled", "disabled"],
            userState: "enabled",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });

        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled"],
            userState: "inherit",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("returns false with feature_user_disabled reason when user is disabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled"],
            userState: "disabled",
          })
        ).toEqual({ enabled: false, reason: "feature_user_disabled" });
      });
    });

    describe("when teams only inherit (no org enabled)", () => {
      it("returns true when user explicitly opts in", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["inherit"],
            userState: "enabled",
          })
        ).toEqual({ enabled: true, reason: "feature_enabled" });
      });

      it("returns false with feature_no_explicit_enablement reason when user inherits", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["inherit"],
            userState: "inherit",
          })
        ).toEqual({ enabled: false, reason: "feature_no_explicit_enablement" });
      });
    });
  });

  describe("when user has no teams", () => {
    it("returns true when org is enabled and user is enabled/inherits", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: [],
          userState: "enabled",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });

      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: [],
          userState: "inherit",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });
    });

    it("returns false with feature_no_explicit_enablement reason when org inherits and user inherits", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: [],
          userState: "inherit",
        })
      ).toEqual({ enabled: false, reason: "feature_no_explicit_enablement" });
    });

    it("returns true when org inherits but user explicitly enables", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: [],
          userState: "enabled",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });
    });
  });

  describe("user opt-in behavior", () => {
    it("allows user to opt-in regardless of org/team inheritance state", () => {
      // User can opt-in even when org and all teams are just inheriting
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["inherit", "inherit"],
          userState: "enabled",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });
    });

    it("blocks user opt-in when all teams have explicitly disabled", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["disabled", "disabled"],
          userState: "enabled",
        })
      ).toEqual({ enabled: false, reason: "feature_all_teams_disabled" });
    });

    it("blocks user opt-in when org has explicitly disabled", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "disabled",
          teamStates: ["inherit"],
          userState: "enabled",
        })
      ).toEqual({ enabled: false, reason: "feature_org_disabled" });
    });
  });

  describe("truth table from design doc", () => {
    it("org disabled, any teams, any user → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "disabled",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toEqual({ enabled: false, reason: "feature_org_disabled" });
    });

    it("org enabled, all teams disabled, any user → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: ["disabled", "disabled"],
          userState: "enabled",
        })
      ).toEqual({ enabled: false, reason: "feature_all_teams_disabled" });
    });

    it("org enabled, at least one team enabled/inherit, user disabled → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: ["enabled"],
          userState: "disabled",
        })
      ).toEqual({ enabled: false, reason: "feature_user_disabled" });
    });

    it("org enabled, at least one team enabled/inherit, user enabled/inherit → true", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });

      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: ["inherit"],
          userState: "inherit",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });
    });

    it("org inherit/null, all teams disabled, any user → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["disabled"],
          userState: "enabled",
        })
      ).toEqual({ enabled: false, reason: "feature_all_teams_disabled" });
    });

    it("org inherit/null, at least one team enabled, user disabled → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["enabled"],
          userState: "disabled",
        })
      ).toEqual({ enabled: false, reason: "feature_user_disabled" });
    });

    it("org inherit/null, at least one team enabled, user enabled/inherit → true", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });

      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["enabled"],
          userState: "inherit",
        })
      ).toEqual({ enabled: true, reason: "feature_enabled" });
    });
  });
});
