import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@calcom/prisma";
import { CreditUsageType } from "@calcom/prisma/enums";

// Mock all dependencies before importing the module under test
const mockGetUserAndTeamWithBillingPermission = vi.fn();
const mockSendCreditBalanceLimitReachedEmails = vi.fn();
const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogError = vi.fn();

vi.mock("./getUserAndTeamWithBillingPermission", () => ({
  getUserAndTeamWithBillingPermission: mockGetUserAndTeamWithBillingPermission,
}));

vi.mock("@calcom/emails/billing-email-service", () => ({
  sendCreditBalanceLimitReachedEmails: mockSendCreditBalanceLimitReachedEmails,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn(() => ({
      info: mockLogInfo,
      warn: mockLogWarn,
      error: mockLogError,
    })),
  },
}));

// Import the module under test AFTER all mocks are set up
const { handleInsufficientCredits } = await import("./handleInsufficientCredits");

describe("handleInsufficientCredits", () => {
  const mockPrismaClient = {} as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful execution", () => {
    it("should send email when team is found and log success", async () => {
      const mockTeam = {
        id: 1,
        name: "Test Team",
        adminAndOwners: [
          {
            id: 1,
            name: "Admin User",
            email: "admin@test.com",
            t: vi.fn(),
          },
        ],
      };

      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({
        team: mockTeam,
        user: undefined,
      });

      mockSendCreditBalanceLimitReachedEmails.mockResolvedValue();

      const params = {
        userId: 1,
        teamId: 1,
        creditFor: CreditUsageType.RECORDING,
        prismaClient: mockPrismaClient,
        context: { additionalInfo: "test" },
      };

      await handleInsufficientCredits(params);

      expect(mockGetUserAndTeamWithBillingPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 1,
        prismaClient: mockPrismaClient,
      });

      expect(mockSendCreditBalanceLimitReachedEmails).toHaveBeenCalledWith({
        team: mockTeam,
        user: undefined,
        creditFor: CreditUsageType.RECORDING,
      });

      expect(mockLogInfo).toHaveBeenCalledWith("Credit limit reached email sent", {
        userId: 1,
        teamId: 1,
        creditFor: CreditUsageType.RECORDING,
        additionalInfo: "test",
      });

      expect(mockLogWarn).not.toHaveBeenCalled();
      expect(mockLogError).not.toHaveBeenCalled();
    });

    it("should send email when user is found and log success", async () => {
      const mockUser = {
        id: 2,
        name: "Test User",
        email: "user@test.com",
        t: vi.fn(),
      };

      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({
        team: undefined,
        user: mockUser,
      });

      mockSendCreditBalanceLimitReachedEmails.mockResolvedValue();

      const params = {
        userId: 2,
        teamId: null,
        creditFor: CreditUsageType.AI_SUMMARY,
        prismaClient: mockPrismaClient,
      };

      await handleInsufficientCredits(params);

      expect(mockGetUserAndTeamWithBillingPermission).toHaveBeenCalledWith({
        userId: 2,
        teamId: null,
        prismaClient: mockPrismaClient,
      });

      expect(mockSendCreditBalanceLimitReachedEmails).toHaveBeenCalledWith({
        team: undefined,
        user: mockUser,
        creditFor: CreditUsageType.AI_SUMMARY,
      });

      expect(mockLogInfo).toHaveBeenCalledWith("Credit limit reached email sent", {
        userId: 2,
        teamId: null,
        creditFor: CreditUsageType.AI_SUMMARY,
      });
    });

    it("should send email when both team and user are found", async () => {
      const mockTeam = {
        id: 1,
        name: "Test Team",
        adminAndOwners: [],
      };

      const mockUser = {
        id: 2,
        name: "Test User",
        email: "user@test.com",
        t: vi.fn(),
      };

      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({
        team: mockTeam,
        user: mockUser,
      });

      mockSendCreditBalanceLimitReachedEmails.mockResolvedValue();

      await handleInsufficientCredits({
        userId: 2,
        teamId: 1,
        creditFor: CreditUsageType.AI_SUMMARY,
        prismaClient: mockPrismaClient,
      });

      expect(mockSendCreditBalanceLimitReachedEmails).toHaveBeenCalledWith({
        team: mockTeam,
        user: mockUser,
        creditFor: CreditUsageType.AI_SUMMARY,
      });
    });

    it("should handle context parameter correctly when provided", async () => {
      const mockUser = {
        id: 1,
        name: "User",
        email: "user@test.com",
        t: vi.fn(),
      };

      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({
        user: mockUser,
      });

      mockSendCreditBalanceLimitReachedEmails.mockResolvedValue();

      const context = { bookingId: 123, eventId: 456 };

      await handleInsufficientCredits({
        userId: 1,
        creditFor: CreditUsageType.RECORDING,
        prismaClient: mockPrismaClient,
        context,
      });

      expect(mockLogInfo).toHaveBeenCalledWith("Credit limit reached email sent", {
        userId: 1,
        teamId: undefined,
        creditFor: CreditUsageType.RECORDING,
        bookingId: 123,
        eventId: 456,
      });
    });

    it("should handle context parameter correctly when not provided", async () => {
      const mockUser = {
        id: 1,
        name: "User",
        email: "user@test.com",
        t: vi.fn(),
      };

      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({
        user: mockUser,
      });

      mockSendCreditBalanceLimitReachedEmails.mockResolvedValue();

      await handleInsufficientCredits({
        userId: 1,
        creditFor: CreditUsageType.RECORDING,
        prismaClient: mockPrismaClient,
      });

      expect(mockLogInfo).toHaveBeenCalledWith("Credit limit reached email sent", {
        userId: 1,
        teamId: undefined,
        creditFor: CreditUsageType.RECORDING,
      });
    });
  });

  describe("warning cases", () => {
    it("should log warning when neither team nor user is found", async () => {
      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({});

      const params = {
        userId: 999,
        teamId: 999,
        creditFor: CreditUsageType.RECORDING,
        prismaClient: mockPrismaClient,
        context: { reason: "not found" },
      };

      await handleInsufficientCredits(params);

      expect(mockGetUserAndTeamWithBillingPermission).toHaveBeenCalledWith({
        userId: 999,
        teamId: 999,
        prismaClient: mockPrismaClient,
      });

      expect(mockSendCreditBalanceLimitReachedEmails).not.toHaveBeenCalled();

      expect(mockLogWarn).toHaveBeenCalledWith("No user or team found to send credit limit email", {
        userId: 999,
        teamId: 999,
        creditFor: CreditUsageType.RECORDING,
        reason: "not found",
      });

      expect(mockLogInfo).not.toHaveBeenCalled();
      expect(mockLogError).not.toHaveBeenCalled();
    });

    it("should log warning when user and team are explicitly undefined", async () => {
      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({
        user: undefined,
        team: undefined,
      });

      await handleInsufficientCredits({
        userId: null,
        teamId: null,
        creditFor: CreditUsageType.AI_SUMMARY,
        prismaClient: mockPrismaClient,
      });

      expect(mockSendCreditBalanceLimitReachedEmails).not.toHaveBeenCalled();
      expect(mockLogWarn).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should catch and log error from getUserAndTeamWithBillingPermission", async () => {
      const error = new Error("Database connection failed");
      mockGetUserAndTeamWithBillingPermission.mockRejectedValue(error);

      const params = {
        userId: 1,
        teamId: 1,
        creditFor: CreditUsageType.RECORDING,
        prismaClient: mockPrismaClient,
        context: { operation: "test" },
      };

      await handleInsufficientCredits(params);

      expect(mockSendCreditBalanceLimitReachedEmails).not.toHaveBeenCalled();

      expect(mockLogError).toHaveBeenCalledWith("Failed to send credit limit email", {
        error,
        userId: 1,
        teamId: 1,
        creditFor: CreditUsageType.RECORDING,
        operation: "test",
      });

      expect(mockLogInfo).not.toHaveBeenCalled();
      expect(mockLogWarn).not.toHaveBeenCalled();
    });

    it("should catch and log error from sendCreditBalanceLimitReachedEmails", async () => {
      const mockUser = {
        id: 1,
        name: "User",
        email: "user@test.com",
        t: vi.fn(),
      };

      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({
        user: mockUser,
      });

      const error = new Error("Email service unavailable");
      mockSendCreditBalanceLimitReachedEmails.mockRejectedValue(error);

      await handleInsufficientCredits({
        userId: 1,
        creditFor: CreditUsageType.AI_SUMMARY,
        prismaClient: mockPrismaClient,
      });

      expect(mockLogError).toHaveBeenCalledWith("Failed to send credit limit email", {
        error,
        userId: 1,
        teamId: undefined,
        creditFor: CreditUsageType.AI_SUMMARY,
      });

      expect(mockLogInfo).not.toHaveBeenCalled();
    });

    it("should not throw errors even when all operations fail", async () => {
      mockGetUserAndTeamWithBillingPermission.mockRejectedValue(new Error("Critical failure"));

      // This should not throw
      await expect(
        handleInsufficientCredits({
          userId: 1,
          creditFor: CreditUsageType.RECORDING,
          prismaClient: mockPrismaClient,
        })
      ).resolves.not.toThrow();

      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe("parameter handling", () => {
    it("should handle null userId and teamId correctly", async () => {
      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({});

      await handleInsufficientCredits({
        userId: null,
        teamId: null,
        creditFor: CreditUsageType.RECORDING,
        prismaClient: mockPrismaClient,
      });

      expect(mockGetUserAndTeamWithBillingPermission).toHaveBeenCalledWith({
        userId: null,
        teamId: null,
        prismaClient: mockPrismaClient,
      });
    });

    it("should handle undefined userId and teamId correctly", async () => {
      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({});

      await handleInsufficientCredits({
        userId: undefined,
        teamId: undefined,
        creditFor: CreditUsageType.AI_SUMMARY,
        prismaClient: mockPrismaClient,
      });

      expect(mockGetUserAndTeamWithBillingPermission).toHaveBeenCalledWith({
        userId: undefined,
        teamId: undefined,
        prismaClient: mockPrismaClient,
      });
    });

    it("should handle all CreditUsageType values", async () => {
      const mockUser = { id: 1, name: "User", email: "user@test.com", t: vi.fn() };
      mockGetUserAndTeamWithBillingPermission.mockResolvedValue({ user: mockUser });
      mockSendCreditBalanceLimitReachedEmails.mockResolvedValue();

      // Test each credit usage type
      const creditTypes = [CreditUsageType.RECORDING, CreditUsageType.AI_SUMMARY];

      for (const creditFor of creditTypes) {
        await handleInsufficientCredits({
          userId: 1,
          creditFor,
          prismaClient: mockPrismaClient,
        });

        expect(mockSendCreditBalanceLimitReachedEmails).toHaveBeenCalledWith({
          team: undefined,
          user: mockUser,
          creditFor,
        });
      }
    });
  });
});
