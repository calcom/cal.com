import { describe, expect, it } from "vitest";
import type { WebhookForReservationCheck } from "./dto/types";
import { subscriberUrlReserved } from "./subscriberUrlReserved";

describe("subscriberUrlReserved", () => {
  const baseWebhook: WebhookForReservationCheck = {
    id: "wh-1",
    subscriberUrl: "https://example.com/webhook",
    teamId: null,
    userId: null,
    eventTypeId: null,
    platform: false,
  };

  it("should throw when no scope is provided", () => {
    expect(() =>
      subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        webhooks: [],
      })
    ).toThrow("Either teamId, userId, eventTypeId or platform must be provided.");
  });

  describe("teamId scope", () => {
    it("should return true when URL is reserved for same team", () => {
      const webhooks = [{ ...baseWebhook, teamId: 1 }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        teamId: 1,
        webhooks,
      });
      expect(result).toBe(true);
    });

    it("should return false when URL is reserved for different team", () => {
      const webhooks = [{ ...baseWebhook, teamId: 2 }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        teamId: 1,
        webhooks,
      });
      expect(result).toBe(false);
    });

    it("should exclude current webhook by id", () => {
      const webhooks = [{ ...baseWebhook, id: "wh-1", teamId: 1 }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        id: "wh-1",
        teamId: 1,
        webhooks,
      });
      expect(result).toBe(false);
    });
  });

  describe("eventTypeId scope", () => {
    it("should return true when URL is reserved for same eventType", () => {
      const webhooks = [{ ...baseWebhook, eventTypeId: 10 }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        eventTypeId: 10,
        webhooks,
      });
      expect(result).toBe(true);
    });

    it("should return false when URL is for different eventType", () => {
      const webhooks = [{ ...baseWebhook, eventTypeId: 20 }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        eventTypeId: 10,
        webhooks,
      });
      expect(result).toBe(false);
    });
  });

  describe("platform scope", () => {
    it("should return true when URL is reserved for platform", () => {
      const webhooks = [{ ...baseWebhook, platform: true }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        platform: true,
        webhooks,
      });
      expect(result).toBe(true);
    });

    it("should return false when no platform webhook matches", () => {
      const webhooks = [{ ...baseWebhook, platform: false }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        platform: true,
        webhooks,
      });
      expect(result).toBe(false);
    });
  });

  describe("userId scope", () => {
    it("should return true when URL is reserved for same user", () => {
      const webhooks = [{ ...baseWebhook, userId: 5 }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        userId: 5,
        webhooks,
      });
      expect(result).toBe(true);
    });

    it("should return false when URL is for different user", () => {
      const webhooks = [{ ...baseWebhook, userId: 6 }];
      const result = subscriberUrlReserved({
        subscriberUrl: "https://example.com/webhook",
        userId: 5,
        webhooks,
      });
      expect(result).toBe(false);
    });
  });

  it("should return false when webhooks list is empty", () => {
    const result = subscriberUrlReserved({
      subscriberUrl: "https://example.com/webhook",
      userId: 5,
      webhooks: [],
    });
    expect(result).toBe(false);
  });

  it("should return false when webhooks is undefined", () => {
    const result = subscriberUrlReserved({
      subscriberUrl: "https://example.com/webhook",
      userId: 5,
    });
    expect(result).toBe(false);
  });
});
