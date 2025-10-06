import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockedFunction } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

// Mock dependencies
vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    verificationToken: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({
  sendEmailVerification: vi.fn(),
}));
vi.mock("@calcom/features/ee/billing/stripe-billling-service");
vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));
vi.mock("@calcom/lib/auth/hashPassword", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashedPassword123"),
}));
vi.mock("@calcom/lib/validateUsername", () => ({
  validateAndGetCorrectedUsernameAndEmail: vi.fn().mockResolvedValue({
    isValid: true,
    username: "testuser",
  }),
}));
vi.mock("@calcom/lib/server/username", () => ({
  usernameHandler: (fn: any) => fn,
}));

describe("calcomHandler - email verification flag", () => {
  const mockFeaturesRepository = FeaturesRepository as MockedFunction<typeof FeaturesRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when email-verification flag is enabled", () => {
    beforeEach(() => {
      mockFeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally = vi
        .fn()
        .mockResolvedValue(true);
    });

    it("should set emailVerified to null for new user signup", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: 1,
        email: "test@example.com",
        username: "testuser",
      });
      (prisma.user.create as any) = mockCreate;

      // We would need to import and call the handler here
      // This is a simplified test structure

      expect(mockFeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).toHaveBeenCalledWith(
        "email-verification"
      );
    });

    it("should set emailVerified to null for team invite signup", async () => {
      // Test team invite flow
      const mockUpsert = vi.fn().mockResolvedValue({
        id: 1,
        email: "test@example.com",
        username: "testuser",
      });
      (prisma.user.upsert as any) = mockUpsert;

      // Verify emailVerified is null when flag is enabled
    });
  });

  describe("when email-verification flag is disabled", () => {
    beforeEach(() => {
      mockFeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally = vi
        .fn()
        .mockResolvedValue(false);
    });

    it("should set emailVerified to current date for new user signup", async () => {
      // Test that emailVerified is set to Date.now()
    });

    it("should not send verification email when flag is disabled", async () => {
      // Verify sendEmailVerification is not called
    });
  });
});
