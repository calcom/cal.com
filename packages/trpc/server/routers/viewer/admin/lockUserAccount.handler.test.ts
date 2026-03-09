import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendEmailVerification = vi.fn().mockResolvedValue({ ok: true, skipped: false });
const mockFindBlockedEmail = vi.fn();
const mockDeleteEntry = vi.fn();
const mockDeleteAllWorkflowReminders = vi.fn().mockResolvedValue(undefined);
const mockFindActiveByUserId = vi.fn().mockResolvedValue([]);

vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
}));
vi.mock("@calcom/features/watchlist/lib/repository/GlobalWatchlistRepository", () => ({
  GlobalWatchlistRepository: class {
    findBlockedEmail = mockFindBlockedEmail;
    deleteEntry = mockDeleteEntry;
  },
}));
vi.mock("@calcom/features/watchlist/lib/utils/normalization", () => ({
  normalizeEmail: vi.fn((e: string) => e.toLowerCase()),
}));
vi.mock("@calcom/features/ee/workflows/repositories/WorkflowReminderRepository", () => ({
  WorkflowReminderRepository: class {
    findActiveByUserId = mockFindActiveByUserId;
  },
}));
vi.mock("@calcom/features/ee/workflows/repositories/WorkflowRepository", () => ({
  WorkflowRepository: {
    deleteAllWorkflowReminders: (...args: unknown[]) => mockDeleteAllWorkflowReminders(...args),
  },
}));
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    user: {
      update: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import { prisma } from "@calcom/prisma";
import lockUserAccountHandler from "./lockUserAccount.handler";

describe("lockUserAccountHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: null,
    profile: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 42,
      email: "test@example.com",
      username: "testuser",
    } as never);
    mockFindBlockedEmail.mockResolvedValue(null);
    mockDeleteEntry.mockResolvedValue(undefined);
    mockSendEmailVerification.mockResolvedValue({ ok: true, skipped: false });
    mockDeleteAllWorkflowReminders.mockResolvedValue(undefined);
    mockFindActiveByUserId.mockResolvedValue([]);
  });

  describe("unlocking a user", () => {
    it("should remove watchlist entry when unlocking a user", async () => {
      const watchlistEntry = { id: "watchlist-entry-123" };
      mockFindBlockedEmail.mockResolvedValue(watchlistEntry);

      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: false },
      });

      expect(mockDeleteEntry).toHaveBeenCalledWith("watchlist-entry-123");
    });

    it("should send verification email after unlocking and removing from watchlist", async () => {
      const watchlistEntry = { id: "watchlist-entry-123" };
      mockFindBlockedEmail.mockResolvedValue(watchlistEntry);

      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: false },
      });

      expect(mockSendEmailVerification).toHaveBeenCalledWith({
        email: "test@example.com",
        username: "testuser",
      });
    });

    it("should send verification email even when no watchlist entry exists", async () => {
      mockFindBlockedEmail.mockResolvedValue(null);

      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: false },
      });

      expect(mockDeleteEntry).not.toHaveBeenCalled();
      expect(mockSendEmailVerification).toHaveBeenCalledWith({
        email: "test@example.com",
        username: "testuser",
      });
    });

    it("should call deleteEntry before sendEmailVerification", async () => {
      const callOrder: string[] = [];
      mockFindBlockedEmail.mockResolvedValue({ id: "entry-1" });
      mockDeleteEntry.mockImplementation(async () => {
        callOrder.push("deleteEntry");
      });
      mockSendEmailVerification.mockImplementation(async () => {
        callOrder.push("sendEmailVerification");
        return { ok: true, skipped: false };
      });

      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: false },
      });

      expect(callOrder).toEqual(["deleteEntry", "sendEmailVerification"]);
    });
  });

  describe("locking a user", () => {
    it("should not remove watchlist entry when locking a user", async () => {
      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: true },
      });

      expect(mockFindBlockedEmail).not.toHaveBeenCalled();
      expect(mockDeleteEntry).not.toHaveBeenCalled();
    });

    it("should not send verification email when locking a user", async () => {
      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: true },
      });

      expect(mockSendEmailVerification).not.toHaveBeenCalled();
    });

    it("should cancel scheduled workflow reminders when locking a user", async () => {
      const mockReminders = [
        { id: 1, referenceId: "ref-1", method: "EMAIL" },
        { id: 2, referenceId: "ref-2", method: "SMS" },
      ];
      mockFindActiveByUserId.mockResolvedValue(mockReminders);

      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: true },
      });

      expect(mockFindActiveByUserId).toHaveBeenCalledWith({ userId: 42 });
      expect(mockDeleteAllWorkflowReminders).toHaveBeenCalledWith(mockReminders);
    });

    it("should not call deleteAllWorkflowReminders when there are no reminders", async () => {
      mockFindActiveByUserId.mockResolvedValue([]);

      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: true },
      });

      expect(mockFindActiveByUserId).toHaveBeenCalledWith({ userId: 42 });
      expect(mockDeleteAllWorkflowReminders).not.toHaveBeenCalled();
    });

    it("should not fail if cancelling workflow reminders throws an error", async () => {
      mockFindActiveByUserId.mockRejectedValue(new Error("DB error"));

      const result = await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: true },
      });

      expect(result).toEqual({ success: true, userId: 42, locked: true });
    });
  });

  describe("unlocking a user does not cancel workflow reminders", () => {
    it("should not query for workflow reminders when unlocking", async () => {
      await lockUserAccountHandler({
        ctx: { user: mockUser as never },
        input: { userId: 42, locked: false },
      });

      expect(mockFindActiveByUserId).not.toHaveBeenCalled();
      expect(mockDeleteAllWorkflowReminders).not.toHaveBeenCalled();
    });
  });
});
