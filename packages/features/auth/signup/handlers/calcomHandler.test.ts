import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { validateAndGetCorrectedUsernameAndEmail } from "@calcom/lib/validateUsername";
import { prisma } from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

import calcomHandler from "./calcomHandler";

// Mock dependencies
vi.mock("@calcom/prisma", () => {
  const mockPrismaObj = {
    user: {
      create: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    verificationToken: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
    },
  };
  return {
    prisma: mockPrismaObj,
    default: mockPrismaObj,
  };
});

vi.mock("@calcom/features/flags/features.repository");
vi.mock("@calcom/features/auth/lib/verifyEmail");
vi.mock("@calcom/features/ee/billing/stripe-billling-service", () => ({
  StripeBillingService: vi.fn().mockImplementation(() => ({
    createCustomer: vi.fn().mockResolvedValue({ stripeCustomerId: "cus_test123" }),
  })),
}));
vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));
vi.mock("@calcom/lib/auth/hashPassword");
vi.mock("@calcom/lib/validateUsername");
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("@calcom/lib/getLocaleFromRequest", () => ({
  getLocaleFromRequest: vi.fn().mockResolvedValue("en"),
}));
vi.mock("@calcom/features/auth/signup/utils/prefillAvatar", () => ({
  prefillAvatar: vi.fn(),
}));
vi.mock("@calcom/features/auth/signup/utils/createOrUpdateMemberships", () => ({
  createOrUpdateMemberships: vi.fn().mockResolvedValue({}),
}));
vi.mock("@calcom/features/auth/signup/utils/token", () => ({
  findTokenByToken: vi.fn(),
  throwIfTokenExpired: vi.fn(),
  validateAndGetCorrectedUsernameForTeam: vi.fn().mockResolvedValue("testuser"),
}));
vi.mock("@calcom/features/auth/signup/utils/organization", () => ({
  joinAnyChildTeamOnOrgInvite: vi.fn(),
}));

describe("calcomHandler - email verification flag", () => {
  const mockRequestBody = {
    email: "test@example.com",
    password: "Password123!",
    username: "testuser",
  };

  const mockUsernameStatus = {
    requestedUserName: "testuser",
    statusCode: 200,
    json: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hashPassword).mockResolvedValue("hashedPassword123");
    vi.mocked(validateAndGetCorrectedUsernameAndEmail).mockResolvedValue({
      isValid: true,
      username: "testuser",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("when email-verification flag is enabled", () => {
    beforeEach(() => {
      vi.mocked(FeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).mockResolvedValue(true);
    });

    it("should set emailVerified to null for new user signup", async () => {
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 1,
        email: mockRequestBody.email,
        username: mockRequestBody.username,
        emailVerified: null,
      } as any);

      await calcomHandler(mockRequestBody, mockUsernameStatus);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: mockRequestBody.email.toLowerCase(),
            username: mockRequestBody.username,
            emailVerified: null,
          }),
        })
      );
    });

    it("should send verification email when flag is enabled", async () => {
      prisma.user.create.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email,
        username: mockRequestBody.username,
      } as any);

      await calcomHandler(mockRequestBody, mockUsernameStatus);

      expect(sendEmailVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockRequestBody.email.toLowerCase(),
          username: mockRequestBody.username,
        })
      );
    });
  });

  describe("when email-verification flag is disabled", () => {
    beforeEach(() => {
      vi.mocked(FeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).mockResolvedValue(false);
    });

    it("should set emailVerified to current date for new user signup", async () => {
      prisma.user.create.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email,
        username: mockRequestBody.username,
        emailVerified: new Date(),
      } as any);

      await calcomHandler(mockRequestBody, mockUsernameStatus);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: mockRequestBody.email.toLowerCase(),
            username: mockRequestBody.username,
            emailVerified: expect.any(Date),
          }),
        })
      );

      // Verify it's actually a Date and not null
      const callArgs = prisma.user.create.mock.calls[0][0];
      expect(callArgs.data.emailVerified).toBeInstanceOf(Date);
      expect(callArgs.data.emailVerified).not.toBeNull();
    });

    it("should not send verification email when flag is disabled", async () => {
      prisma.user.create.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email,
        username: mockRequestBody.username,
        emailVerified: new Date(),
      } as any);

      await calcomHandler(mockRequestBody, mockUsernameStatus);

      expect(sendEmailVerification).not.toHaveBeenCalled();
    });
  });

  describe("team invite flow", () => {
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
      } as any);
    });

    it("should set emailVerified to null when flag is enabled", async () => {
      vi.mocked(FeaturesRepository.prototype.checkIfFeatureIsEnabledGlobally).mockResolvedValue(true);
      prisma.user.upsert.mockResolvedValue({
        id: 1,
        email: mockRequestBody.email,
        username: mockRequestBody.username,
        emailVerified: null,
      } as any);

      await calcomHandler({ ...mockRequestBody, token: mockToken }, mockUsernameStatus);

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
        email: mockRequestBody.email,
        username: mockRequestBody.username,
        emailVerified: new Date(),
      } as any);

      await calcomHandler({ ...mockRequestBody, token: mockToken }, mockUsernameStatus);

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
    });
  });
});
