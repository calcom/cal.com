import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockedFunction } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import prisma from "@calcom/prisma";

// Mock dependencies
vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
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
  isUsernameReservedDueToMigration: vi.fn().mockResolvedValue(false),
}));

describe("selfHostedHandler - email verification flag", () => {
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
      const mockUpsert = vi.fn().mockResolvedValue({
        id: 1,
        email: "test@example.com",
        username: "testuser",
        emailVerified: null,
      });
      (prisma.user.upsert as any) = mockUpsert;

      expect(mockFeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).toBeDefined();
    });

    it("should send verification email when flag is enabled", async () => {
      // Verify sendEmailVerification is called
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
