import type { NextApiRequest, NextApiResponse } from "next";
import { describe, it, expect, beforeEach, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billing-service";
import { OnboardingPathService } from "@calcom/features/onboarding/lib/onboarding-path.service";
import { WEBAPP_URL } from "@calcom/lib/constants";
// Import mocked prisma
import { prisma } from "@calcom/prisma";

import { handler, cleanUpVerificationTokens } from "./verify-email";

// Mock all dependencies
vi.mock("@calcom/dayjs");
vi.mock("@calcom/features/ee/billing/stripe-billing-service");
vi.mock("@calcom/features/onboarding/lib/onboarding-path.service");
vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://test.cal.com",
  IS_STRIPE_ENABLED: true,
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    verificationToken: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    secondaryEmail: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("verify-email handler", () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let redirectSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let mockBillingService: { updateCustomer: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.resetAllMocks();

    jsonSpy = vi.fn();
    redirectSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

    req = {
      query: {},
    };

    res = {
      status: statusSpy,
      json: jsonSpy,
      redirect: redirectSpy,
    };

    // Mock StripeBillingService
    mockBillingService = {
      updateCustomer: vi.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(StripeBillingService).mockImplementation(() => mockBillingService as any);

    // Mock OnboardingPathService
    vi.mocked(OnboardingPathService.getGettingStartedPath).mockResolvedValue("/getting-started");

    // Mock dayjs
    vi.mocked(dayjs).mockReturnValue({
      isBefore: vi.fn().mockReturnValue(false),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe("Token validation", () => {
    it("should return 401 if token is not provided", async () => {
      req.query = {};

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow();
    });

    it("should return 401 if token is not found in database", async () => {
      req.query = { token: "invalid-token" };
      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue(null);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ message: "No token found" });
    });

    it("should return 401 if token is expired", async () => {
      req.query = { token: "valid-token" };
      const expiredDate = new Date("2020-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "test@example.com",
        token: "valid-token",
        expires: expiredDate,
        secondaryEmailId: null,
      });

      vi.mocked(dayjs).mockReturnValue({
        isBefore: vi.fn().mockReturnValue(true),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ message: "Token expired" });
    });
  });

  describe("Secondary email verification", () => {
    it("should verify secondary email and redirect to profile page", async () => {
      req.query = { token: "valid-token" };
      const futureDate = new Date("2030-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "secondary@example.com",
        token: "valid-token",
        expires: futureDate,
        secondaryEmailId: 123,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.secondaryEmail.update).mockResolvedValue({} as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(prisma.secondaryEmail.update).toHaveBeenCalledWith({
        where: {
          id: 123,
          email: "secondary@example.com",
        },
        data: {
          emailVerified: expect.any(Date),
        },
      });

      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(redirectSpy).toHaveBeenCalledWith(`${WEBAPP_URL}/settings/my-account/profile`);
    });
  });

  describe("Primary email verification", () => {
    it("should return 401 if user is not found", async () => {
      req.query = { token: "valid-token" };
      const futureDate = new Date("2030-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "test@example.com",
        token: "valid-token",
        expires: futureDate,
        secondaryEmailId: null,
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({ message: "Cannot find a user attached to this token" });
    });

    it("should verify email and redirect to event-types for completed onboarding", async () => {
      req.query = { token: "valid-token" };
      const futureDate = new Date("2030-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "test@example.com",
        token: "valid-token",
        expires: futureDate,
        secondaryEmailId: null,
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        emailVerified: null,
        completedOnboarding: true,
        metadata: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { emailVerified: expect.any(Date) },
      });

      expect(redirectSpy).toHaveBeenCalledWith(`${WEBAPP_URL}/event-types`);
    });

    it("should verify email and redirect to getting started for incomplete onboarding", async () => {
      req.query = { token: "valid-token" };
      const futureDate = new Date("2030-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "test@example.com",
        token: "valid-token",
        expires: futureDate,
        secondaryEmailId: null,
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        emailVerified: null,
        completedOnboarding: false,
        metadata: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(OnboardingPathService.getGettingStartedPath).toHaveBeenCalled();
      expect(redirectSpy).toHaveBeenCalledWith(`${WEBAPP_URL}/getting-started`);
    });
  });

  describe("Email change verification", () => {
    it("should return 401 if new email already exists for another user", async () => {
      req.query = { token: "valid-token" };
      const futureDate = new Date("2030-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "test@example.com",
        token: "valid-token",
        expires: futureDate,
        secondaryEmailId: null,
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        emailVerified: new Date(),
        completedOnboarding: true,
        metadata: {
          emailChangeWaitingForVerification: "newemail@example.com",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        message: "A User already exists with this email",
      });
    });

    it("should return 401 if new email exists as secondary email for another user", async () => {
      req.query = { token: "valid-token" };
      const futureDate = new Date("2030-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "test@example.com",
        token: "valid-token",
        expires: futureDate,
        secondaryEmailId: null,
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        emailVerified: new Date(),
        completedOnboarding: true,
        metadata: {
          emailChangeWaitingForVerification: "newemail@example.com",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.secondaryEmail.findUnique).mockResolvedValue({
        id: 123,
        userId: 2, // Different user
        email: "newemail@example.com",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        message: "A User already exists with this email",
      });
    });

    it("should update email and update Stripe customer", async () => {
      req.query = { token: "valid-token" };
      const futureDate = new Date("2030-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "test@example.com",
        token: "valid-token",
        expires: futureDate,
        secondaryEmailId: null,
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        emailVerified: new Date(),
        completedOnboarding: true,
        metadata: {
          emailChangeWaitingForVerification: "newemail@example.com",
          stripeCustomerId: "cus_123",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.secondaryEmail.findUnique).mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          email: "newemail@example.com",
          metadata: {
            stripeCustomerId: "cus_123",
          },
        },
      });

      expect(mockBillingService.updateCustomer).toHaveBeenCalledWith({
        customerId: "cus_123",
        email: "newemail@example.com",
      });

      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(jsonSpy).toHaveBeenCalledWith({
        updatedEmail: "newemail@example.com",
      });
    });

    it("should swap emails when updating to existing secondary email of same user", async () => {
      req.query = { token: "valid-token" };
      const futureDate = new Date("2030-01-01");
      const oldEmailVerifiedDate = new Date("2020-01-01");

      vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
        id: 1,
        identifier: "test@example.com",
        token: "valid-token",
        expires: futureDate,
        secondaryEmailId: null,
      });

      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        emailVerified: oldEmailVerifiedDate,
        completedOnboarding: true,
        metadata: {
          emailChangeWaitingForVerification: "newemail@example.com",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.secondaryEmail.findUnique).mockResolvedValue({
        id: 123,
        userId: 1, // Same user
        email: "newemail@example.com",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.secondaryEmail.update).mockResolvedValue({} as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any);

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          email: "newemail@example.com",
          metadata: {},
        },
      });

      expect(prisma.secondaryEmail.update).toHaveBeenCalledWith({
        where: {
          id: 123,
          userId: 1,
        },
        data: {
          email: "test@example.com",
          emailVerified: oldEmailVerifiedDate,
        },
      });

      expect(jsonSpy).toHaveBeenCalledWith({
        updatedEmail: "newemail@example.com",
      });
    });
  });

  describe("cleanUpVerificationTokens", () => {
    it("should delete verification token by id", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.verificationToken.delete).mockResolvedValue({} as any);

      await cleanUpVerificationTokens(123);

      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: 123 },
      });
    });
  });
});
