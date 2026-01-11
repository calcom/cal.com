import type { NextApiRequest, NextApiResponse } from "next";
import { describe, it, expect, vi, beforeEach } from "vitest";

import sendVerificationRequest from "@calcom/features/auth/lib/sendVerificationRequest";
import { HttpError } from "@calcom/lib/http-error";
import { VerificationTokenService } from "@calcom/lib/server/service/VerificationTokenService";
import { prisma } from "@calcom/prisma";

import { getCustomerAndCheckoutSession } from "../../lib/getCustomerAndCheckoutSession";

// Mock dependencies
vi.mock("@calcom/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../lib/getCustomerAndCheckoutSession");
vi.mock("@calcom/features/auth/lib/sendVerificationRequest");
vi.mock("@calcom/lib/server/service/VerificationTokenService", () => ({
  VerificationTokenService: {
    create: vi.fn(),
  },
}));

const mockGetCustomerAndCheckoutSession = vi.mocked(getCustomerAndCheckoutSession);
const mockSendVerificationRequest = vi.mocked(sendVerificationRequest);
const mockVerificationTokenServiceCreate = vi.mocked(VerificationTokenService.create);

// Type the mocked prisma properly
const mockPrisma = prisma as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe("paymentCallback", () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      query: {
        callbackUrl: "/premium-username-checkout",
        checkoutSessionId: "cs_test_123",
      },
      url: "/api/payment/callback",
      method: "GET",
    };

    mockRes = {
      redirect: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Default mock implementations
    mockGetCustomerAndCheckoutSession.mockResolvedValue({
      stripeCustomer: {
        id: "cus_123",
        email: "test@example.com",
        metadata: {
          username: "premium-user",
        },
      },
      checkoutSession: {
        payment_status: "paid",
      },
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    mockPrisma.user.findFirst.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      locale: "en",
      metadata: {},
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    mockPrisma.user.update.mockResolvedValue({
      id: 1,
      username: "premium-user",
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    mockVerificationTokenServiceCreate.mockResolvedValue("test-token-123");
    mockSendVerificationRequest.mockResolvedValue(undefined);
  });

  describe("VerificationTokenService integration", () => {
    it("should call VerificationTokenService.create with correct parameters", async () => {
      const { default: handler } = await import("../paymentCallback");

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockVerificationTokenServiceCreate).toHaveBeenCalledWith({
        identifier: "test@example.com",
        expires: expect.any(Date),
      });

      const callArgs = mockVerificationTokenServiceCreate.mock.calls[0][0];
      const expiresDate = callArgs.expires;
      const now = Date.now();
      const oneDayInMs = 86400 * 1000;

      // Verify expires is approximately 1 day from now (within 1 second tolerance)
      expect(expiresDate.getTime()).toBeGreaterThan(now);
      expect(expiresDate.getTime()).toBeLessThanOrEqual(now + oneDayInMs + 1000);
    });

    it("should send verification email with token from service", async () => {
      const { default: handler } = await import("../paymentCallback");

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockSendVerificationRequest).toHaveBeenCalledWith({
        identifier: "test@example.com",
        url: expect.stringContaining("token=test-token-123"),
      });
    });

    it("should create verification token before sending email", async () => {
      const { default: handler } = await import("../paymentCallback");
      const callOrder: string[] = [];

      mockVerificationTokenServiceCreate.mockImplementation(async function () {
        callOrder.push("create-token");
        return "test-token";
      });

      mockSendVerificationRequest.mockImplementation(async () => {
        callOrder.push("send-email");
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(callOrder).toEqual(["create-token", "send-email"]);
    });

    it("should create verification token only after payment is confirmed", async () => {
      mockGetCustomerAndCheckoutSession.mockResolvedValue({
        stripeCustomer: {
          id: "cus_123",
          email: "test@example.com",
          metadata: { username: "premium-user" },
        },
        checkoutSession: {
          payment_status: "unpaid",
        },
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const { default: handler } = await import("../paymentCallback");

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockVerificationTokenServiceCreate).not.toHaveBeenCalled();
      expect(mockSendVerificationRequest).not.toHaveBeenCalled();
    });

    it("should handle user found by stripeCustomerId", async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce(null) // First call by email returns null
        .mockResolvedValueOnce({
          // Second call by stripeCustomerId succeeds
          id: 2,
          email: "different@example.com",
          locale: "en",
          metadata: { stripeCustomerId: "cus_123" },
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const { default: handler } = await import("../paymentCallback");

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockVerificationTokenServiceCreate).toHaveBeenCalledWith({
        identifier: "different@example.com", // Should use user.email from found user
        expires: expect.any(Date),
      });
    });

    it("should update user with premium username before creating token", async () => {
      const { default: handler } = await import("../paymentCallback");
      const callOrder: string[] = [];

      mockPrisma.user.update.mockImplementation(async () => {
        callOrder.push("update-user");
        return {} as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      mockVerificationTokenServiceCreate.mockImplementation(async function () {
        callOrder.push("create-token");
        return "token";
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(callOrder).toEqual(["update-user", "create-token"]);
    });

    it("should redirect with correct parameters after successful payment", async () => {
      const { default: handler } = await import("../paymentCallback");

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const redirectUrl = (mockRes.redirect as any).mock.calls[0][0] as string;
      expect(redirectUrl).toContain("email=test%40example.com");
      expect(redirectUrl).toContain("username=premium-user");
      expect(redirectUrl).toContain("paymentStatus=paid");
    });

    it("should not create verification token when stripe customer is not found", async () => {
      mockGetCustomerAndCheckoutSession.mockResolvedValue({
        stripeCustomer: null,
        checkoutSession: { payment_status: "paid" },
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const { default: handler } = await import("../paymentCallback");

      try {
        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).statusCode).toBe(404);
      }

      expect(mockVerificationTokenServiceCreate).not.toHaveBeenCalled();
    });

    it("should not create verification token when user is not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const { default: handler } = await import("../paymentCallback");

      try {
        await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).statusCode).toBe(404);
      }

      expect(mockVerificationTokenServiceCreate).not.toHaveBeenCalled();
    });

    it("should use user email if stripe customer email is missing", async () => {
      mockGetCustomerAndCheckoutSession.mockResolvedValue({
        stripeCustomer: {
          id: "cus_123",
          email: null,
          metadata: { username: "premium-user" },
        },
        checkoutSession: { payment_status: "paid" },
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const { default: handler } = await import("../paymentCallback");

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockVerificationTokenServiceCreate).toHaveBeenCalledWith({
        identifier: "test@example.com", // Should use user.email
        expires: expect.any(Date),
      });
    });
  });
});
