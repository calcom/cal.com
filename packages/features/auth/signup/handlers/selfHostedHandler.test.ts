import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { isUsernameReservedDueToMigration } from "@calcom/lib/server/username";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/lib/validateUsername";
import prisma from "@calcom/prisma";

import selfHostedHandler from "./selfHostedHandler";

// Mock dependencies
const mockPrismaObj = {
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
};

vi.mock("@calcom/prisma", () => ({
  default: mockPrismaObj,
  prisma: mockPrismaObj,
}));

vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/features/auth/lib/verifyEmail");
vi.mock("@calcom/lib/auth/hashPassword");
vi.mock("@calcom/lib/validateUsername");
vi.mock("@calcom/lib/server/username");
vi.mock("@calcom/features/auth/signup/utils/prefillAvatar", () => ({
  prefillAvatar: vi.fn(),
}));
vi.mock("@calcom/features/auth/signup/utils/createOrUpdateMemberships", () => ({
  createOrUpdateMemberships: vi.fn().mockResolvedValue({ membership: {} }),
}));

describe("selfHostedHandler - email verification flag", () => {
  const mockRequestBody = {
    email: "test@example.com",
    password: "Password123!",
    username: "testuser",
    language: "en",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hashPassword).mockResolvedValue("hashedPassword123");
    vi.mocked(validateAndGetCorrectedUsernameAndEmail).mockResolvedValue({
      isValid: true,
      username: "testuser",
    });
    vi.mocked(isUsernameReservedDueToMigration).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("when email-verification flag is enabled", () => {
    beforeEach(() => {
      vi.mocked(FeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).mockResolvedValue(true);
    });

    it("should set emailVerified to null for new user signup", async () => {
      prisma.user.upsert.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email.toLowerCase(),
        username: mockRequestBody.username,
        emailVerified: null,
      } as any);

      await selfHostedHandler(mockRequestBody);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            emailVerified: null,
          }),
          create: expect.objectContaining({
            emailVerified: null,
          }),
        })
      );
    });

    it("should send verification email when flag is enabled", async () => {
      prisma.user.upsert.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email.toLowerCase(),
        username: mockRequestBody.username,
      } as any);

      await selfHostedHandler(mockRequestBody);

      expect(sendEmailVerification).toHaveBeenCalledWith({
        email: mockRequestBody.email.toLowerCase(),
        username: mockRequestBody.username,
        language: mockRequestBody.language,
      });
    });
  });

  describe("when email-verification flag is disabled", () => {
    beforeEach(() => {
      vi.mocked(FeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).mockResolvedValue(false);
    });

    it("should set emailVerified to current date for new user signup", async () => {
      prisma.user.upsert.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email.toLowerCase(),
        username: mockRequestBody.username,
        emailVerified: new Date(),
      } as any);

      await selfHostedHandler(mockRequestBody);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            emailVerified: expect.any(Date),
          }),
          create: expect.objectContaining({
            emailVerified: expect.any(Date),
          }),
        })
      );

      // Verify it's actually a Date and not null
      const callArgs = prisma.user.upsert.mock.calls[0][0];
      expect(callArgs.update.emailVerified).toBeInstanceOf(Date);
      expect(callArgs.update.emailVerified).not.toBeNull();
      expect(callArgs.create.emailVerified).toBeInstanceOf(Date);
      expect(callArgs.create.emailVerified).not.toBeNull();
    });

    it("should not send verification email when flag is disabled", async () => {
      prisma.user.upsert.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email.toLowerCase(),
        username: mockRequestBody.username,
        emailVerified: new Date(),
      } as any);

      await selfHostedHandler(mockRequestBody);

      expect(sendEmailVerification).not.toHaveBeenCalled();
    });
  });

  describe("team invite flow with token", () => {
    const mockToken = "test-token-123";
    const mockTeamId = 1;

    beforeEach(() => {
      prisma.verificationToken.findFirst.mockResolvedValue({
        id: 1,
        identifier: mockRequestBody.email,
        token: mockToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: mockTeamId,
      } as any);
      prisma.team.findUnique.mockResolvedValue({
        id: mockTeamId,
        name: "Test Team",
        slug: "test-team",
        parentId: null,
        organizationSettings: null,
        parent: null,
        isOrganization: false,
      } as any);
    });

    it("should set emailVerified to null when flag is enabled", async () => {
      vi.mocked(FeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).mockResolvedValue(true);
      prisma.user.upsert.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email.toLowerCase(),
        username: mockRequestBody.username,
        emailVerified: null,
      } as any);

      await selfHostedHandler({ ...mockRequestBody, token: mockToken });

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            emailVerified: null,
          }),
          create: expect.objectContaining({
            emailVerified: null,
          }),
        })
      );
    });

    it("should set emailVerified to date when flag is disabled", async () => {
      vi.mocked(FeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).mockResolvedValue(false);
      prisma.user.upsert.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email.toLowerCase(),
        username: mockRequestBody.username,
        emailVerified: new Date(),
      } as any);

      await selfHostedHandler({ ...mockRequestBody, token: mockToken });

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            emailVerified: expect.any(Date),
          }),
          create: expect.objectContaining({
            emailVerified: expect.any(Date),
          }),
        })
      );

      // Verify both paths have Date objects
      const callArgs = prisma.user.upsert.mock.calls[0][0];
      expect(callArgs.update.emailVerified).toBeInstanceOf(Date);
      expect(callArgs.create.emailVerified).toBeInstanceOf(Date);
    });
  });
});
