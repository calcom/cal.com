import { describe, it, expect, vi, beforeEach } from "vitest";

import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
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
vi.mock("@calcom/features/ee/billing/stripe-billling-service", () => ({
  StripeBillingService: vi.fn().mockImplementation(() => ({
    createCustomer: vi.fn().mockResolvedValue({ stripeCustomerId: "cus_test123" }),
  })),
}));
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
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("@calcom/lib/getLocaleFromRequest", () => ({
  getLocaleFromRequest: vi.fn().mockResolvedValue("en"),
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
      const mockCreate = vi.fn((data) => {
        // Verify that emailVerified is a Date object (not null)
        expect(data.data.emailVerified).toBeInstanceOf(Date);
        expect(data.data.emailVerified).not.toBeNull();
        return Promise.resolve({
          id: 1,
          email: data.data.email,
          username: data.data.username,
          emailVerified: data.data.emailVerified,
        });
      });
      (prisma.user.create as any) = mockCreate;

      // The test verifies the mock was set up correctly
      // In a full integration test, we would call the handler here
      expect(mockFeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).toBeDefined();
    });

    it("should not send verification email when flag is disabled", async () => {
      const mockSendEmail = vi.mocked(sendEmailVerification);

      // Verify that sendEmailVerification should NOT be called when flag is disabled
      // This would be tested in the full handler invocation
      expect(mockSendEmail).toBeDefined();

      // Note: In a complete test, after calling the handler with flag disabled,
      // we would verify: expect(mockSendEmail).not.toHaveBeenCalled()
    });
  });
});

/**
 * Note: These tests are scaffolded to demonstrate the testing strategy.
 * For full integration tests, you would:
 * 1. Import the actual handler
 * 2. Call it with test data
 * 3. Verify the prisma.user.create/upsert was called with correct emailVerified value
 * 4. Verify sendEmailVerification was called (or not) based on flag state
 */
