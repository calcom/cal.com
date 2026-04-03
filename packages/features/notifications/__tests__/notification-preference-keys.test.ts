import { NotificationEvent } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import {
  NOTIFICATIONS_ENABLED_KEY,
  NOTIFICATION_CHANNELS,
  buildAllChannelKeys,
  buildChannelKey,
  parseChannelKey,
} from "../notification-preference-keys";

describe("notification-preference-keys", () => {
  describe("NOTIFICATIONS_ENABLED_KEY", () => {
    it("should be a stable string constant", () => {
      expect(NOTIFICATIONS_ENABLED_KEY).toBe("notifications.enabled");
    });
  });

  describe("NOTIFICATION_CHANNELS", () => {
    it("should contain all four push-related channels", () => {
      expect(NOTIFICATION_CHANNELS).toEqual(["app_push", "web_push", "slack", "telegram"]);
    });
  });

  describe("buildChannelKey", () => {
    it("should produce lowercase event + channel key", () => {
      expect(buildChannelKey(NotificationEvent.BOOKING_CONFIRMED, "web_push")).toBe(
        "booking_confirmed.channel.web_push"
      );
    });

    it("should work for all channels", () => {
      for (const channel of NOTIFICATION_CHANNELS) {
        const key = buildChannelKey(NotificationEvent.BOOKING_CANCELLED, channel);
        expect(key).toBe(`booking_cancelled.channel.${channel}`);
      }
    });
  });

  describe("parseChannelKey", () => {
    it("should parse a valid channel key", () => {
      const result = parseChannelKey("booking_confirmed.channel.web_push");
      expect(result).toEqual({ event: "BOOKING_CONFIRMED", channel: "web_push" });
    });

    it("should return null for non-channel keys", () => {
      expect(parseChannelKey("notifications.enabled")).toBeNull();
    });

    it("should return null for unknown channel names", () => {
      expect(parseChannelKey("booking_confirmed.channel.sms")).toBeNull();
    });

    it("should roundtrip with buildChannelKey", () => {
      const key = buildChannelKey(NotificationEvent.BOOKING_RESCHEDULED, "slack");
      const parsed = parseChannelKey(key);
      expect(parsed).toEqual({ event: "BOOKING_RESCHEDULED", channel: "slack" });
    });
  });

  describe("buildAllChannelKeys", () => {
    it("should return one key per channel for the given event", () => {
      const keys = buildAllChannelKeys(NotificationEvent.BOOKING_CONFIRMED);
      expect(keys).toHaveLength(4);
      expect(keys).toContain("booking_confirmed.channel.app_push");
      expect(keys).toContain("booking_confirmed.channel.web_push");
      expect(keys).toContain("booking_confirmed.channel.slack");
      expect(keys).toContain("booking_confirmed.channel.telegram");
    });
  });
});
