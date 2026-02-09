import { describe, expect, it } from "vitest";

import { applyAutoOptIn } from "./applyAutoOptIn";

describe("applyAutoOptIn", () => {
  describe("org state transformation", () => {
    it("transforms org state from inherit to enabled when orgAutoOptIn is true", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: [],
        userState: "inherit",
        orgAutoOptIn: true,
        teamAutoOptIns: [],
        userAutoOptIn: false,
      });

      expect(result.effectiveOrgState).toBe("enabled");
    });

    it("keeps org state as inherit when orgAutoOptIn is false", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: [],
        userState: "inherit",
        orgAutoOptIn: false,
        teamAutoOptIns: [],
        userAutoOptIn: false,
      });

      expect(result.effectiveOrgState).toBe("inherit");
    });

    it("does not transform org state when it is explicitly enabled", () => {
      const result = applyAutoOptIn({
        orgState: "enabled",
        teamStates: [],
        userState: "inherit",
        orgAutoOptIn: true,
        teamAutoOptIns: [],
        userAutoOptIn: false,
      });

      expect(result.effectiveOrgState).toBe("enabled");
    });

    it("does not transform org state when it is explicitly disabled", () => {
      const result = applyAutoOptIn({
        orgState: "disabled",
        teamStates: [],
        userState: "inherit",
        orgAutoOptIn: true,
        teamAutoOptIns: [],
        userAutoOptIn: false,
      });

      expect(result.effectiveOrgState).toBe("disabled");
    });
  });

  describe("team states transformation", () => {
    it("transforms team states from inherit to enabled when corresponding autoOptIn is true", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: ["inherit", "inherit", "inherit"],
        userState: "inherit",
        orgAutoOptIn: false,
        teamAutoOptIns: [true, false, true],
        userAutoOptIn: false,
      });

      expect(result.effectiveTeamStates).toEqual(["enabled", "inherit", "enabled"]);
    });

    it("does not transform team states when they are explicitly set", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: ["enabled", "disabled", "inherit"],
        userState: "inherit",
        orgAutoOptIn: false,
        teamAutoOptIns: [true, true, false],
        userAutoOptIn: false,
      });

      expect(result.effectiveTeamStates).toEqual(["enabled", "disabled", "inherit"]);
    });
  });

  describe("user state transformation", () => {
    it("transforms user state from inherit to enabled when userAutoOptIn is true", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: [],
        userState: "inherit",
        orgAutoOptIn: false,
        teamAutoOptIns: [],
        userAutoOptIn: true,
      });

      expect(result.effectiveUserState).toBe("enabled");
    });

    it("keeps user state as inherit when userAutoOptIn is false", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: [],
        userState: "inherit",
        orgAutoOptIn: false,
        teamAutoOptIns: [],
        userAutoOptIn: false,
      });

      expect(result.effectiveUserState).toBe("inherit");
    });

    it("does not transform user state when it is explicitly enabled", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: [],
        userState: "enabled",
        orgAutoOptIn: false,
        teamAutoOptIns: [],
        userAutoOptIn: true,
      });

      expect(result.effectiveUserState).toBe("enabled");
    });

    it("does not transform user state when it is explicitly disabled", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: [],
        userState: "disabled",
        orgAutoOptIn: false,
        teamAutoOptIns: [],
        userAutoOptIn: true,
      });

      expect(result.effectiveUserState).toBe("disabled");
    });
  });

  describe("combined transformations", () => {
    it("transforms all levels independently when autoOptIn is true", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: ["inherit", "inherit"],
        userState: "inherit",
        orgAutoOptIn: true,
        teamAutoOptIns: [true, true],
        userAutoOptIn: true,
      });

      expect(result.effectiveOrgState).toBe("enabled");
      expect(result.effectiveTeamStates).toEqual(["enabled", "enabled"]);
      expect(result.effectiveUserState).toBe("enabled");
    });

    it("only transforms levels with autoOptIn enabled", () => {
      const result = applyAutoOptIn({
        orgState: "inherit",
        teamStates: ["inherit", "inherit"],
        userState: "inherit",
        orgAutoOptIn: false,
        teamAutoOptIns: [true, false],
        userAutoOptIn: true,
      });

      expect(result.effectiveOrgState).toBe("inherit");
      expect(result.effectiveTeamStates).toEqual(["enabled", "inherit"]);
      expect(result.effectiveUserState).toBe("enabled");
    });

    it("respects explicit states even when autoOptIn is true", () => {
      const result = applyAutoOptIn({
        orgState: "disabled",
        teamStates: ["enabled", "disabled"],
        userState: "enabled",
        orgAutoOptIn: true,
        teamAutoOptIns: [true, true],
        userAutoOptIn: true,
      });

      expect(result.effectiveOrgState).toBe("disabled");
      expect(result.effectiveTeamStates).toEqual(["enabled", "disabled"]);
      expect(result.effectiveUserState).toBe("enabled");
    });
  });
});
