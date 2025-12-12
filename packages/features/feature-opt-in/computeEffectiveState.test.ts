import { describe, it, expect } from "vitest";

import { computeEffectiveState } from "./computeEffectiveState";

describe("computeEffectiveState", () => {
  describe("when global is disabled", () => {
    it("returns false regardless of team and user state", () => {
      expect(
        computeEffectiveState({ globalEnabled: false, teamState: "enabled", userState: "enabled" })
      ).toBe(false);
      expect(
        computeEffectiveState({ globalEnabled: false, teamState: "disabled", userState: "enabled" })
      ).toBe(false);
      expect(
        computeEffectiveState({ globalEnabled: false, teamState: "inherit", userState: "enabled" })
      ).toBe(false);
      expect(
        computeEffectiveState({ globalEnabled: false, teamState: "enabled", userState: "disabled" })
      ).toBe(false);
      expect(
        computeEffectiveState({ globalEnabled: false, teamState: "enabled", userState: "inherit" })
      ).toBe(false);
    });
  });

  describe("when global is enabled", () => {
    describe("when team is disabled", () => {
      it("returns false regardless of user state", () => {
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "disabled", userState: "enabled" })
        ).toBe(false);
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "disabled", userState: "disabled" })
        ).toBe(false);
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "disabled", userState: "inherit" })
        ).toBe(false);
      });
    });

    describe("when team is enabled", () => {
      it("returns true when user is enabled", () => {
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "enabled", userState: "enabled" })
        ).toBe(true);
      });

      it("returns false when user is disabled", () => {
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "enabled", userState: "disabled" })
        ).toBe(false);
      });

      it("returns true when user inherits (inherits from enabled team)", () => {
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "enabled", userState: "inherit" })
        ).toBe(true);
      });
    });

    describe("when team inherits", () => {
      it("returns true when user is enabled", () => {
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "inherit", userState: "enabled" })
        ).toBe(true);
      });

      it("returns false when user is disabled", () => {
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "inherit", userState: "disabled" })
        ).toBe(false);
      });

      it("returns false when user inherits (team not explicitly enabled)", () => {
        expect(
          computeEffectiveState({ globalEnabled: true, teamState: "inherit", userState: "inherit" })
        ).toBe(false);
      });
    });
  });
});
