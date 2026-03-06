import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { IEventTypesRepository } from "@calcom/features/eventtypes/eventtypes.repository.interface";
import type { IUsersRepository } from "@calcom/features/users/users.repository.interface";
import { WebhookVersion } from "../interface/IWebhookRepository";
import { WebhookRepository } from "./WebhookRepository";

describe("WebhookRepository", () => {
  let mockPrisma: { $queryRaw: ReturnType<typeof vi.fn> };
  let mockEventTypeRepo: { findParentEventTypeId: ReturnType<typeof vi.fn> };
  let mockUserRepo: Record<string, ReturnType<typeof vi.fn>>;
  let repository: WebhookRepository;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(),
    };
    mockEventTypeRepo = {
      findParentEventTypeId: vi.fn().mockResolvedValue(null),
    };
    mockUserRepo = {};
    repository = new WebhookRepository(
      mockPrisma as unknown as PrismaClient,
      mockEventTypeRepo as unknown as IEventTypesRepository,
      mockUserRepo as unknown as IUsersRepository
    );
  });

  describe("getSubscribers", () => {
    it("should validate webhook version through parseWebhookVersion for valid versions", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "webhook-1",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: "test-secret",
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          version: WebhookVersion.V_2021_10_20,
          priority: 1,
        },
      ]);

      const result = await repository.getSubscribers({
        userId: 1,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe(WebhookVersion.V_2021_10_20);
    });

    it("should throw on invalid webhook version from database", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "webhook-2",
          subscriberUrl: "https://example.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          version: "invalid-version",
          priority: 1,
        },
      ]);

      await expect(
        repository.getSubscribers({
          userId: 1,
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        })
      ).rejects.toThrow('Invalid webhook version: "invalid-version"');
    });

    it("should validate version for all returned webhooks", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "webhook-1",
          subscriberUrl: "https://example1.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          version: WebhookVersion.V_2021_10_20,
          priority: 1,
        },
        {
          id: "webhook-2",
          subscriberUrl: "https://example2.com/webhook",
          payloadTemplate: null,
          appId: null,
          secret: null,
          time: null,
          timeUnit: null,
          eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
          version: WebhookVersion.V_2021_10_20,
          priority: 2,
        },
      ]);

      const result = await repository.getSubscribers({
        userId: 1,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(WebhookVersion.V_2021_10_20);
      expect(result[1].version).toBe(WebhookVersion.V_2021_10_20);
    });
  });
});
