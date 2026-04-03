import { NotificationEvent } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import type { NotificationPreferencesRow } from "../notification-scope-types";
import { DEFAULT_CHANNEL_CONFIG } from "../notification-scope-types";
import { resolveEffectiveNotificationPreferences } from "../resolve-effective-notification-preferences";

const BOOKING_CONFIRMED: NotificationEvent = NotificationEvent.BOOKING_CONFIRMED;

function makePreferencesRow(overrides: Partial<NotificationPreferencesRow> = {}): NotificationPreferencesRow {
  return {
    event: BOOKING_CONFIRMED,
    appPushEnabled: true,
    webPushEnabled: true,
    slackEnabled: true,
    telegramEnabled: true,
    ...overrides,
  };
}

describe("resolveEffectiveNotificationPreferences", () => {
  describe("when no scope rows exist", () => {
    it("should return default config with all channels enabled", () => {
      const result = resolveEffectiveNotificationPreferences({
        event: BOOKING_CONFIRMED,
        organizationPreferences: null,
        userPreferences: null,
      });

      expect(result).toEqual({
        event: BOOKING_CONFIRMED,
        ...DEFAULT_CHANNEL_CONFIG,
        source: "default",
      });
    });
  });

  describe("organization scope only", () => {
    it("should apply org preferences as full override", () => {
      const orgPrefs = makePreferencesRow({
        slackEnabled: false,
        webPushEnabled: false,
      });

      const result = resolveEffectiveNotificationPreferences({
        event: BOOKING_CONFIRMED,
        organizationPreferences: orgPrefs,
        userPreferences: null,
      });

      expect(result).toEqual({
        event: BOOKING_CONFIRMED,
        appPushEnabled: true,
        webPushEnabled: false,
        slackEnabled: false,
        telegramEnabled: true,
        source: "organization",
      });
    });
  });

  describe("user overrides organization", () => {
    it("should replace org preferences entirely when user row exists", () => {
      const orgPrefs = makePreferencesRow({
        webPushEnabled: false,
        slackEnabled: false,
      });
      const userPrefs = makePreferencesRow({
        appPushEnabled: false,
        telegramEnabled: false,
      });

      const result = resolveEffectiveNotificationPreferences({
        event: BOOKING_CONFIRMED,
        organizationPreferences: orgPrefs,
        userPreferences: userPrefs,
      });

      expect(result).toEqual({
        event: BOOKING_CONFIRMED,
        appPushEnabled: false,
        webPushEnabled: true,
        slackEnabled: true,
        telegramEnabled: false,
        source: "user",
      });
    });

    it("should inherit from org when user has no row", () => {
      const orgPrefs = makePreferencesRow({
        appPushEnabled: false,
      });

      const result = resolveEffectiveNotificationPreferences({
        event: BOOKING_CONFIRMED,
        organizationPreferences: orgPrefs,
        userPreferences: null,
      });

      expect(result.appPushEnabled).toBe(false);
      expect(result.source).toBe("organization");
    });

    it("should apply user preferences when no org row exists", () => {
      const userPrefs = makePreferencesRow({
        webPushEnabled: false,
        slackEnabled: false,
        telegramEnabled: false,
      });

      const result = resolveEffectiveNotificationPreferences({
        event: BOOKING_CONFIRMED,
        organizationPreferences: null,
        userPreferences: userPrefs,
      });

      expect(result).toEqual({
        event: BOOKING_CONFIRMED,
        appPushEnabled: true,
        webPushEnabled: false,
        slackEnabled: false,
        telegramEnabled: false,
        source: "user",
      });
    });
  });

  describe("row-absence inheritance semantics", () => {
    it("should NOT merge channels across scopes — each row is a full replacement", () => {
      const orgPrefs = makePreferencesRow({
        webPushEnabled: false,
        slackEnabled: false,
      });
      const userPrefs = makePreferencesRow({
        telegramEnabled: false,
      });

      const result = resolveEffectiveNotificationPreferences({
        event: BOOKING_CONFIRMED,
        organizationPreferences: orgPrefs,
        userPreferences: userPrefs,
      });

      expect(result.webPushEnabled).toBe(true);
      expect(result.slackEnabled).toBe(true);
      expect(result.telegramEnabled).toBe(false);
      expect(result.source).toBe("user");
    });

    it("should fall back to built-in defaults when neither scope has a row", () => {
      const result = resolveEffectiveNotificationPreferences({
        event: BOOKING_CONFIRMED,
        organizationPreferences: null,
        userPreferences: null,
      });

      expect(result.appPushEnabled).toBe(true);
      expect(result.webPushEnabled).toBe(true);
      expect(result.slackEnabled).toBe(true);
      expect(result.telegramEnabled).toBe(true);
      expect(result.source).toBe("default");
    });
  });

  describe("organization as default, not hard block", () => {
    it("should allow user to re-enable channels org has disabled", () => {
      const orgPrefs = makePreferencesRow({
        appPushEnabled: false,
        webPushEnabled: false,
        slackEnabled: false,
        telegramEnabled: false,
      });
      const userPrefs = makePreferencesRow({
        appPushEnabled: true,
        webPushEnabled: true,
        slackEnabled: true,
        telegramEnabled: true,
      });

      const result = resolveEffectiveNotificationPreferences({
        event: BOOKING_CONFIRMED,
        organizationPreferences: orgPrefs,
        userPreferences: userPrefs,
      });

      expect(result.appPushEnabled).toBe(true);
      expect(result.webPushEnabled).toBe(true);
      expect(result.slackEnabled).toBe(true);
      expect(result.telegramEnabled).toBe(true);
      expect(result.source).toBe("user");
    });
  });
});
