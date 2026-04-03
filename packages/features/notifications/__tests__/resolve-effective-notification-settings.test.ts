import { describe, expect, it } from "vitest";
import { resolveEffectiveNotificationSettings } from "../resolve-effective-notification-settings";

describe("resolveEffectiveNotificationSettings", () => {
  describe("when no scope rows exist", () => {
    it("should return default enabled=true", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: null,
        userSettings: null,
      });

      expect(result).toEqual({ enabled: true, source: "default" });
    });
  });

  describe("organization scope only", () => {
    it("should apply organization settings when present", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: { enabled: false },
        userSettings: null,
      });

      expect(result).toEqual({ enabled: false, source: "organization" });
    });

    it("should apply organization enabled=true", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: { enabled: true },
        userSettings: null,
      });

      expect(result).toEqual({ enabled: true, source: "organization" });
    });
  });

  describe("user overrides organization", () => {
    it("should override org disabled with user enabled", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: { enabled: false },
        userSettings: { enabled: true },
      });

      expect(result).toEqual({ enabled: true, source: "user" });
    });

    it("should override org enabled with user disabled", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: { enabled: true },
        userSettings: { enabled: false },
      });

      expect(result).toEqual({ enabled: false, source: "user" });
    });

    it("should apply user settings when no org row exists", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: null,
        userSettings: { enabled: false },
      });

      expect(result).toEqual({ enabled: false, source: "user" });
    });
  });

  describe("row-absence inheritance", () => {
    it("should inherit org default when user has no row", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: { enabled: false },
        userSettings: null,
      });

      expect(result).toEqual({ enabled: false, source: "organization" });
    });

    it("should fall back to built-in default when neither scope has a row", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: null,
        userSettings: null,
      });

      expect(result).toEqual({ enabled: true, source: "default" });
    });
  });

  describe("organization as default, not hard block", () => {
    it("should allow user to re-enable when org disables", () => {
      const result = resolveEffectiveNotificationSettings({
        organizationSettings: { enabled: false },
        userSettings: { enabled: true },
      });

      expect(result).toEqual({ enabled: true, source: "user" });
    });
  });
});
