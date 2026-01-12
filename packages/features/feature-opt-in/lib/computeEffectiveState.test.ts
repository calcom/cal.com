import { describe, it, expect } from "vitest";

import { computeEffectiveStateAcrossTeams } from "./computeEffectiveState";

describe("computeEffectiveStateAcrossTeams", () => {
  describe("when global is disabled", () => {
    it("returns false regardless of other states", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: false,
          orgState: "enabled",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toBe(false);
    });
  });

  describe("when org is disabled", () => {
    it("returns false regardless of team and user state", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "disabled",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toBe(false);
    });
  });

  describe("when org is enabled", () => {
    describe("when all teams are disabled", () => {
      it("returns false regardless of user state", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["disabled", "disabled"],
            userState: "enabled",
          })
        ).toBe(false);
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
        ).toBe(true);
      });

      it("returns false when user is disabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["enabled", "disabled"],
            userState: "disabled",
          })
        ).toBe(false);
      });

      it("returns true when user inherits", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["enabled", "disabled"],
            userState: "inherit",
          })
        ).toBe(true);
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
        ).toBe(true);

        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "enabled",
            teamStates: ["inherit"],
            userState: "inherit",
          })
        ).toBe(true);
      });
    });
  });

  describe("when org inherits (or no org)", () => {
    describe("when all teams are disabled", () => {
      it("returns false regardless of user state", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["disabled"],
            userState: "enabled",
          })
        ).toBe(false);
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
        ).toBe(true);

        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled"],
            userState: "inherit",
          })
        ).toBe(true);
      });

      it("returns false when user is disabled", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["enabled"],
            userState: "disabled",
          })
        ).toBe(false);
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
        ).toBe(true);
      });

      it("returns false when user inherits because no explicit enablement above", () => {
        expect(
          computeEffectiveStateAcrossTeams({
            globalEnabled: true,
            orgState: "inherit",
            teamStates: ["inherit"],
            userState: "inherit",
          })
        ).toBe(false);
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
      ).toBe(true);

      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: [],
          userState: "inherit",
        })
      ).toBe(true);
    });

    it("returns false when org inherits and user has no explicit enablement", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: [],
          userState: "inherit",
        })
      ).toBe(false); // No explicit enablement in chain, feature should be disabled
    });

    it("returns true when org inherits but user explicitly enables", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: [],
          userState: "enabled",
        })
      ).toBe(true); // User explicit enablement is sufficient
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
      ).toBe(true);
    });

    it("blocks user opt-in when all teams have explicitly disabled", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["disabled", "disabled"],
          userState: "enabled",
        })
      ).toBe(false);
    });

    it("blocks user opt-in when org has explicitly disabled", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "disabled",
          teamStates: ["inherit"],
          userState: "enabled",
        })
      ).toBe(false);
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
      ).toBe(false);
    });

    it("org enabled, all teams disabled, any user → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: ["disabled", "disabled"],
          userState: "enabled",
        })
      ).toBe(false);
    });

    it("org enabled, at least one team enabled/inherit, user disabled → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: ["enabled"],
          userState: "disabled",
        })
      ).toBe(false);
    });

    it("org enabled, at least one team enabled/inherit, user enabled/inherit → true", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toBe(true);

      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "enabled",
          teamStates: ["inherit"],
          userState: "inherit",
        })
      ).toBe(true);
    });

    it("org inherit/null, all teams disabled, any user → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["disabled"],
          userState: "enabled",
        })
      ).toBe(false);
    });

    it("org inherit/null, at least one team enabled, user disabled → false", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["enabled"],
          userState: "disabled",
        })
      ).toBe(false);
    });

    it("org inherit/null, at least one team enabled, user enabled/inherit → true", () => {
      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["enabled"],
          userState: "enabled",
        })
      ).toBe(true);

      expect(
        computeEffectiveStateAcrossTeams({
          globalEnabled: true,
          orgState: "inherit",
          teamStates: ["enabled"],
          userState: "inherit",
        })
      ).toBe(true);
    });
  });
});
