import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppPushSubscriptionRepository } from "../app-push-subscription-repository";
import { AppPushSubscriptionService } from "../app-push-subscription-service";

function createMockRepository(): AppPushSubscriptionRepository {
  return {
    upsert: vi.fn(),
    removeByToken: vi.fn(),
  } as unknown as AppPushSubscriptionRepository;
}

describe("AppPushSubscriptionService", () => {
  let service: AppPushSubscriptionService;
  let mockRepo: AppPushSubscriptionRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new AppPushSubscriptionService(mockRepo);
  });

  describe("register", () => {
    const userId = 42;
    const validInput = {
      token: "ExponentPushToken[abc123]",
      platform: "IOS" as const,
      deviceId: "device-uuid-1",
    };

    it("should upsert a valid APP_PUSH subscription", async () => {
      const expectedResult = {
        id: 1,
        userId,
        type: "APP_PUSH",
        platform: "IOS",
        identifier: validInput.token,
        deviceId: validInput.deviceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepo.upsert).mockResolvedValue(expectedResult);

      const result = await service.register(userId, validInput);

      expect(mockRepo.upsert).toHaveBeenCalledWith(userId, validInput);
      expect(result).toEqual(expectedResult);
    });

    it("should update existing row on duplicate registration", async () => {
      const firstResult = {
        id: 1,
        userId,
        type: "APP_PUSH",
        platform: "IOS",
        identifier: validInput.token,
        deviceId: validInput.deviceId,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      const updatedResult = {
        ...firstResult,
        updatedAt: new Date("2025-06-01"),
      };

      vi.mocked(mockRepo.upsert).mockResolvedValueOnce(firstResult).mockResolvedValueOnce(updatedResult);

      await service.register(userId, validInput);
      const result = await service.register(userId, validInput);

      expect(mockRepo.upsert).toHaveBeenCalledTimes(2);
      expect(result.updatedAt).toEqual(new Date("2025-06-01"));
    });

    it("should allow multiple subscriptions for different tokens", async () => {
      const token1Input = { ...validInput, token: "ExponentPushToken[token1]" };
      const token2Input = { ...validInput, token: "ExponentPushToken[token2]", deviceId: "device-uuid-2" };

      vi.mocked(mockRepo.upsert)
        .mockResolvedValueOnce({
          id: 1,
          userId,
          type: "APP_PUSH",
          platform: "IOS",
          identifier: token1Input.token,
          deviceId: token1Input.deviceId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 2,
          userId,
          type: "APP_PUSH",
          platform: "IOS",
          identifier: token2Input.token,
          deviceId: token2Input.deviceId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const result1 = await service.register(userId, token1Input);
      const result2 = await service.register(userId, token2Input);

      expect(result1.identifier).toBe(token1Input.token);
      expect(result2.identifier).toBe(token2Input.token);
      expect(mockRepo.upsert).toHaveBeenCalledTimes(2);
    });

    it("should reject empty token", async () => {
      const promise = service.register(userId, { ...validInput, token: "" });
      await expect(promise).rejects.toThrow("Invalid app-push subscription input");
      await expect(service.register(userId, { ...validInput, token: "" })).rejects.toBeInstanceOf(
        ErrorWithCode
      );
      try {
        await service.register(userId, { ...validInput, token: "" });
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorWithCode);
        expect((error as ErrorWithCode).code).toBe(ErrorCode.BadRequest);
      }
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it("should reject non-Expo token format", async () => {
      await expect(service.register(userId, { ...validInput, token: "some-random-token" })).rejects.toThrow(
        "Invalid app-push subscription input"
      );
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it("should reject FCM-style token", async () => {
      await expect(
        service.register(userId, { ...validInput, token: "dGVzdC1mY20tdG9rZW4:APA91bHxxx" })
      ).rejects.toThrow("Invalid app-push subscription input");
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it("should reject invalid platform", async () => {
      await expect(service.register(userId, { ...validInput, platform: "WINDOWS" as "IOS" })).rejects.toThrow(
        "Invalid app-push subscription input"
      );
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });

    it("should reject empty deviceId", async () => {
      await expect(service.register(userId, { ...validInput, deviceId: "" })).rejects.toThrow(
        "Invalid app-push subscription input"
      );
      expect(mockRepo.upsert).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    const userId = 42;

    it("should remove an existing APP_PUSH subscription by token", async () => {
      vi.mocked(mockRepo.removeByToken).mockResolvedValue({ count: 1 });

      const result = await service.remove(userId, { token: "ExponentPushToken[abc123]" });

      expect(mockRepo.removeByToken).toHaveBeenCalledWith(userId, "ExponentPushToken[abc123]");
      expect(result).toEqual({ success: true });
    });

    it("should return success false when token does not exist", async () => {
      vi.mocked(mockRepo.removeByToken).mockResolvedValue({ count: 0 });

      const result = await service.remove(userId, { token: "ExponentPushToken[nonexistent]" });

      expect(result).toEqual({ success: false });
    });

    it("should reject empty token on remove", async () => {
      await expect(service.remove(userId, { token: "" })).rejects.toThrow("Invalid app-push removal input");
      try {
        await service.remove(userId, { token: "" });
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorWithCode);
        expect((error as ErrorWithCode).code).toBe(ErrorCode.BadRequest);
      }
      expect(mockRepo.removeByToken).not.toHaveBeenCalled();
    });

    it("should reject non-Expo token format on remove", async () => {
      await expect(service.remove(userId, { token: "not-an-expo-token" })).rejects.toThrow(
        "Invalid app-push removal input"
      );
      expect(mockRepo.removeByToken).not.toHaveBeenCalled();
    });

    it("should only remove APP_PUSH rows (repository is scoped)", async () => {
      vi.mocked(mockRepo.removeByToken).mockResolvedValue({ count: 1 });

      await service.remove(userId, { token: "ExponentPushToken[abc123]" });

      expect(mockRepo.removeByToken).toHaveBeenCalledWith(userId, "ExponentPushToken[abc123]");
    });
  });
});
