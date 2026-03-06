import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { WebhookVersion } from "../../interface/IWebhookRepository";
import { WebhookOutputMapper } from "./WebhookOutputMapper";

describe("WebhookOutputMapper", () => {
  const fullPrismaWebhook = {
    id: "wh-1",
    subscriberUrl: "https://example.com/webhook",
    payloadTemplate: null,
    appId: null,
    secret: "secret-123",
    active: true,
    eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
    eventTypeId: 10,
    teamId: 5,
    userId: 1,
    time: 30,
    timeUnit: "MINUTE" as const,
    version: "2021-10-20",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    platform: false,
    platformOAuthClientId: null,
  };

  const minimalPrismaWebhook = {
    id: "wh-1",
    subscriberUrl: "https://example.com/webhook",
    payloadTemplate: null,
    appId: null,
    secret: "secret-123",
    eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
    time: 30,
    timeUnit: "MINUTE" as const,
    version: "2021-10-20",
  };

  describe("toWebhook", () => {
    it("should map all fields from Prisma to domain Webhook", () => {
      const result = WebhookOutputMapper.toWebhook(fullPrismaWebhook);

      expect(result.id).toBe("wh-1");
      expect(result.subscriberUrl).toBe("https://example.com/webhook");
      expect(result.active).toBe(true);
      expect(result.version).toBe(WebhookVersion.V_2021_10_20);
      expect(result.teamId).toBe(5);
      expect(result.userId).toBe(1);
      expect(result.eventTypeId).toBe(10);
      expect(result.platform).toBe(false);
    });
  });

  describe("toWebhookList", () => {
    it("should map array of webhooks", () => {
      const result = WebhookOutputMapper.toWebhookList([
        fullPrismaWebhook,
        { ...fullPrismaWebhook, id: "wh-2" },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("wh-1");
      expect(result[1].id).toBe("wh-2");
    });
  });

  describe("toSubscriber", () => {
    it("should map minimal fields to WebhookSubscriber", () => {
      const result = WebhookOutputMapper.toSubscriber(minimalPrismaWebhook);

      expect(result.id).toBe("wh-1");
      expect(result.subscriberUrl).toBe("https://example.com/webhook");
      expect(result.version).toBe(WebhookVersion.V_2021_10_20);
      expect(result.secret).toBe("secret-123");
    });

    it("should convert null time/timeUnit to undefined", () => {
      const webhook = { ...minimalPrismaWebhook, time: null, timeUnit: null };
      const result = WebhookOutputMapper.toSubscriber(webhook);

      expect(result.time).toBeUndefined();
      expect(result.timeUnit).toBeUndefined();
    });
  });

  describe("toSubscriberList", () => {
    it("should map array of minimal webhooks", () => {
      const result = WebhookOutputMapper.toSubscriberList([minimalPrismaWebhook]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("wh-1");
    });
  });

  describe("toSubscriberPartial", () => {
    it("should handle partial webhook with missing optional fields", () => {
      const partial = {
        id: "wh-3",
        subscriberUrl: "https://example.com",
        eventTriggers: ["BOOKING_CREATED"],
        version: "2021-10-20",
      };

      const result = WebhookOutputMapper.toSubscriberPartial(partial);

      expect(result.id).toBe("wh-3");
      expect(result.payloadTemplate).toBeNull();
      expect(result.appId).toBeNull();
      expect(result.secret).toBeNull();
      expect(result.time).toBeUndefined();
      expect(result.version).toBe(WebhookVersion.V_2021_10_20);
    });
  });

  describe("legacy methods", () => {
    it("toDomain should delegate to toSubscriber", () => {
      const result = WebhookOutputMapper.toDomain(minimalPrismaWebhook);
      const expected = WebhookOutputMapper.toSubscriber(minimalPrismaWebhook);
      expect(result).toEqual(expected);
    });

    it("toDomainList should delegate to toSubscriberList", () => {
      const result = WebhookOutputMapper.toDomainList([minimalPrismaWebhook]);
      const expected = WebhookOutputMapper.toSubscriberList([minimalPrismaWebhook]);
      expect(result).toEqual(expected);
    });
  });
});
