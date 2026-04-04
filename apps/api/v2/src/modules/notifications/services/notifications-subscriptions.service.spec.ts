jest.mock("@calcom/platform-libraries", () => ({
  AppPushSubscriptionRepository: jest.fn(),
  AppPushSubscriptionService: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    remove: jest.fn(),
  })),
}));

import { AppPushSubscriptionService } from "@calcom/platform-libraries";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { NotificationsSubscriptionsService } from "@/modules/notifications/services/notifications-subscriptions.service";

describe("NotificationsSubscriptionsService", () => {
  let service: NotificationsSubscriptionsService;
  let mockRegister: jest.Mock;
  let mockRemove: jest.Mock;

  beforeEach(async () => {
    mockRegister = jest.fn();
    mockRemove = jest.fn();

    (AppPushSubscriptionService as jest.Mock).mockImplementation(() => ({
      register: mockRegister,
      remove: mockRemove,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsSubscriptionsService,
        {
          provide: PrismaWriteService,
          useValue: {
            prisma: {},
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsSubscriptionsService>(NotificationsSubscriptionsService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("registerAppPush", () => {
    it("should delegate to shared AppPushSubscriptionService.register", async () => {
      const mockSubscription = {
        id: 1,
        userId: 42,
        type: "APP_PUSH",
        platform: "IOS",
        identifier: "ExponentPushToken[test-token]",
        deviceId: "device-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRegister.mockResolvedValue(mockSubscription);

      const input = {
        token: "ExponentPushToken[test-token]",
        platform: "IOS" as const,
        deviceId: "device-123",
      };

      const result = await service.registerAppPush(42, input);

      expect(result).toEqual(mockSubscription);
    });

    it("should propagate errors from shared service", async () => {
      mockRegister.mockRejectedValue(new Error("Validation failed: token is required"));

      const input = {
        token: "",
        platform: "IOS" as const,
        deviceId: "device-123",
      };

      await expect(service.registerAppPush(42, input)).rejects.toThrow("Validation failed: token is required");
    });
  });

  describe("removeAppPush", () => {
    it("should delegate to shared AppPushSubscriptionService.remove", async () => {
      mockRemove.mockResolvedValue({ success: true });

      const input = { token: "ExponentPushToken[test-token]" };

      const result = await service.removeAppPush(42, input);

      expect(result).toEqual({ success: true });
    });

    it("should return success false when token not found", async () => {
      mockRemove.mockResolvedValue({ success: false });

      const input = { token: "ExponentPushToken[nonexistent]" };

      const result = await service.removeAppPush(42, input);

      expect(result).toEqual({ success: false });
    });

    it("should propagate errors from shared service", async () => {
      mockRemove.mockRejectedValue(new Error("Validation failed: token is required"));

      const input = { token: "" };

      await expect(service.removeAppPush(42, input)).rejects.toThrow("Validation failed: token is required");
    });
  });
});
