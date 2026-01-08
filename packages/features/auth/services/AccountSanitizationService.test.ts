import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountSanitizationService } from "./AccountSanitizationService";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("AccountSanitizationService", () => {
  let service: AccountSanitizationService;
  let mockPrismaClient: {
    $transaction: ReturnType<typeof vi.fn>;
    webhook: { deleteMany: ReturnType<typeof vi.fn> };
    apiKey: { deleteMany: ReturnType<typeof vi.fn> };
    credential: { deleteMany: ReturnType<typeof vi.fn> };
    session: { deleteMany: ReturnType<typeof vi.fn> };
    eventType: { updateMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockPrismaClient = {
      $transaction: vi.fn().mockResolvedValue([]),
      webhook: { deleteMany: vi.fn() },
      apiKey: { deleteMany: vi.fn() },
      credential: { deleteMany: vi.fn() },
      session: { deleteMany: vi.fn() },
      eventType: { updateMany: vi.fn() },
    };

    service = new AccountSanitizationService(mockPrismaClient as unknown as PrismaClient);
  });

  describe("sanitizeUnverifiedAccount", () => {
    it("executes all cleanup operations in a transaction", async () => {
      const userId = 123;

      await service.sanitizeUnverifiedAccount(userId);

      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.webhook.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.webhook.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrismaClient.apiKey.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.apiKey.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrismaClient.credential.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.credential.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrismaClient.eventType.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.eventType.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: { successRedirectUrl: null },
      });
    });

    it("propagates database errors", async () => {
      mockPrismaClient.$transaction.mockRejectedValueOnce(new Error("Database connection failed"));

      await expect(service.sanitizeUnverifiedAccount(123)).rejects.toThrow("Database connection failed");
    });

    describe("security guarantees", () => {
      const attackerUserId = 999;

      beforeEach(async () => {
        await service.sanitizeUnverifiedAccount(attackerUserId);
      });

      it("removes webhooks to prevent data exfiltration", () => {
        expect(mockPrismaClient.webhook.deleteMany).toHaveBeenCalledWith({
          where: { userId: attackerUserId },
        });
      });

      it("removes API keys to prevent programmatic access", () => {
        expect(mockPrismaClient.apiKey.deleteMany).toHaveBeenCalledWith({
          where: { userId: attackerUserId },
        });
      });

      it("removes credentials to prevent OAuth app abuse", () => {
        expect(mockPrismaClient.credential.deleteMany).toHaveBeenCalledWith({
          where: { userId: attackerUserId },
        });
      });

      it("invalidates sessions to log out attacker immediately", () => {
        expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledWith({
          where: { userId: attackerUserId },
        });
      });

      it("nullifies redirect URLs to prevent phishing", () => {
        expect(mockPrismaClient.eventType.updateMany).toHaveBeenCalledWith({
          where: { userId: attackerUserId },
          data: { successRedirectUrl: null },
        });
      });
    });
  });
});
