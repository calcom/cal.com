import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaWebPushSubscriptionRepository } from "../prisma-web-push-subscription-repository";
import { WebPushSubscriptionService } from "../web-push-subscription-service";

const VALID_SUBSCRIPTION = JSON.stringify({
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: {
    auth: "auth-key-value",
    p256dh: "p256dh-key-value",
  },
});

const VALID_SUBSCRIPTION_WITH_EXPIRATION = JSON.stringify({
  endpoint: "https://updates.push.services.mozilla.com/push/v1/abc",
  expirationTime: null,
  keys: {
    auth: "mozilla-auth",
    p256dh: "mozilla-p256dh",
  },
});

function createMockRepository(): PrismaWebPushSubscriptionRepository {
  return {
    upsert: vi.fn(),
    removeByEndpoint: vi.fn(),
  } as unknown as PrismaWebPushSubscriptionRepository;
}

describe("WebPushSubscriptionService", () => {
  let service: WebPushSubscriptionService;
  let mockRepo: PrismaWebPushSubscriptionRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new WebPushSubscriptionService(mockRepo);
  });

  describe("register", () => {
    const userId = 42;

    it("should register a valid web-push subscription", async () => {
      const expectedResult = {
        id: 1,
        userId,
        type: "WEB_PUSH",
        platform: "WEB",
        identifier: "https://fcm.googleapis.com/fcm/send/abc123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.upsert).mockResolvedValue(expectedResult);

      const result = await service.register(userId, VALID_SUBSCRIPTION);

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        userId,
        "https://fcm.googleapis.com/fcm/send/abc123",
        VALID_SUBSCRIPTION
      );
      expect(result.row).toEqual(expectedResult);
      expect(result.parsed).toEqual({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
        keys: { auth: "auth-key-value", p256dh: "p256dh-key-value" },
      });
    });

    it("should accept subscription with expirationTime field", async () => {
      const expectedResult = {
        id: 2,
        userId,
        type: "WEB_PUSH",
        platform: "WEB",
        identifier: "https://updates.push.services.mozilla.com/push/v1/abc",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.upsert).mockResolvedValue(expectedResult);

      const result = await service.register(userId, VALID_SUBSCRIPTION_WITH_EXPIRATION);

      expect(mockRepo.upsert).toHaveBeenCalledWith(
        userId,
        "https://updates.push.services.mozilla.com/push/v1/abc",
        VALID_SUBSCRIPTION_WITH_EXPIRATION
      );
      expect(result.row).toEqual(expectedResult);
      expect(result.parsed).toEqual({
        endpoint: "https://updates.push.services.mozilla.com/push/v1/abc",
        expirationTime: null,
        keys: { auth: "mozilla-auth", p256dh: "mozilla-p256dh" },
      });
    });

    it("should throw ErrorWithCode(BadRequest) for invalid JSON", async () => {
      const error = await service.register(userId, "not-json").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorWithCode);
      expect((error as ErrorWithCode).code).toBe(ErrorCode.BadRequest);
      expect((error as ErrorWithCode).message).toBe("Invalid web-push subscription input");
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it("should throw ErrorWithCode(BadRequest) for structurally invalid subscription", async () => {
      const missingKeys = JSON.stringify({ endpoint: "https://example.com/push" });

      await expect(service.register(userId, missingKeys)).rejects.toThrow(
        "Invalid web-push subscription input"
      );
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it("should throw ErrorWithCode(BadRequest) for empty string", async () => {
      await expect(service.register(userId, "")).rejects.toThrow("Invalid web-push subscription input");
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    const userId = 42;

    it("should remove an existing web-push subscription", async () => {
      vi.mocked(mockRepo.removeByEndpoint).mockResolvedValue({ count: 1 });

      const result = await service.remove(userId, VALID_SUBSCRIPTION);

      expect(mockRepo.removeByEndpoint).toHaveBeenCalledWith(
        userId,
        "https://fcm.googleapis.com/fcm/send/abc123"
      );
      expect(result).toEqual({ success: true });
    });

    it("should return success false when subscription does not exist", async () => {
      vi.mocked(mockRepo.removeByEndpoint).mockResolvedValue({ count: 0 });

      const result = await service.remove(userId, VALID_SUBSCRIPTION);

      expect(result).toEqual({ success: false });
    });

    it("should throw ErrorWithCode(BadRequest) for invalid JSON on remove", async () => {
      const error = await service.remove(userId, "{invalid").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorWithCode);
      expect((error as ErrorWithCode).code).toBe(ErrorCode.BadRequest);
      expect((error as ErrorWithCode).message).toBe("Invalid web-push subscription input");
      expect(mockRepo.removeByEndpoint).not.toHaveBeenCalled();
    });

    it("should throw ErrorWithCode(BadRequest) for structurally invalid subscription on remove", async () => {
      const noEndpoint = JSON.stringify({ keys: { auth: "a", p256dh: "b" } });

      await expect(service.remove(userId, noEndpoint)).rejects.toThrow(
        "Invalid web-push subscription input"
      );
      expect(mockRepo.removeByEndpoint).not.toHaveBeenCalled();
    });
  });
});
