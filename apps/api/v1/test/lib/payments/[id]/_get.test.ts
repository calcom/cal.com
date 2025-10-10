import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import prisma from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

import paymentById from "../../../../pages/api/payments/[id]";

// Mock the withMiddleware function
vi.mock("~/lib/helpers/withMiddleware", () => ({
  withMiddleware: (_method: string) => (handler: unknown) => handler,
}));

// Mock the query validation
vi.mock("~/lib/validations/shared/queryIdTransformParseInt", () => ({
  schemaQueryIdParseInt: {
    safeParse: vi.fn(),
  },
  withValidQueryIdTransformParseInt: (handler: unknown) => handler,
}));

// Mock prisma
vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  payment: { findUnique: ReturnType<typeof vi.fn> };
};
const mockSchemaQueryIdParseInt = schemaQueryIdParseInt as unknown as {
  safeParse: ReturnType<typeof vi.fn>;
};

describe("GET /api/payments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return 200 with payment object when payment exists", async () => {
    const mockUser = {
      id: 1,
      bookings: [{ id: 1 }],
    };

    const mockPayment = {
      id: 1,
      uid: "payment_123",
      amount: 5000,
      success: true,
      refunded: false,
      fee: 150,
      paymentOption: "ON_BOOKING",
      currency: "USD",
      bookingId: 1,
    };

    mockSchemaQueryIdParseInt.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key", id: "1" },
      userId: 1,
    });

    await paymentById(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      payment: {
        id: 1,
        uid: "payment_123",
        amount: 5000,
        success: true,
        refunded: false,
        fee: 150,
        paymentOption: "ON_BOOKING",
        currency: "USD",
        bookingId: 1,
      },
    });
  });

  it("should return 404 when payment not found", async () => {
    const mockUser = {
      id: 1,
      bookings: [{ id: 1 }],
    };

    mockSchemaQueryIdParseInt.safeParse.mockReturnValue({
      success: true,
      data: { id: 999 },
    });

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.payment.findUnique.mockResolvedValue(null);

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key", id: "999" },
      userId: 1,
    });

    await paymentById(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(404);
    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      message: "Payment with id: 999 not found",
    });
  });

  it("should return 401 when user not authorized for payment", async () => {
    const mockUser = {
      id: 1,
      bookings: [{ id: 2 }], // Different booking ID
    };

    const mockPayment = {
      id: 1,
      uid: "payment_123",
      amount: 5000,
      success: true,
      refunded: false,
      fee: 150,
      paymentOption: "ON_BOOKING",
      currency: "USD",
      bookingId: 1, // Different from user's bookings
    };

    mockSchemaQueryIdParseInt.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key", id: "1" },
      userId: 1,
    });

    await paymentById(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(401);
    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      message: "Unauthorized",
    });
  });

  it("should not process request when invalid query parameters", async () => {
    mockSchemaQueryIdParseInt.safeParse.mockReturnValue({
      success: false,
    });

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key", id: "invalid" },
      userId: 1,
    });

    await paymentById(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    // When query parsing fails, the function returns early without setting status
    expect(res._getStatusCode()).toBe(200);
  });

  it("should include paymentUid (uid field) in response", async () => {
    const mockUser = {
      id: 1,
      bookings: [{ id: 1 }],
    };

    const mockPayment = {
      id: 1,
      uid: "payment_abc123",
      amount: 5000,
      success: true,
      refunded: false,
      fee: 150,
      paymentOption: "ON_BOOKING",
      currency: "USD",
      bookingId: 1,
    };

    mockSchemaQueryIdParseInt.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key", id: "1" },
      userId: 1,
    });

    await paymentById(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.payment).toHaveProperty("uid");
    expect(responseData.payment.uid).toBe("payment_abc123");
  });

  it("should not process request for non-GET methods", async () => {
    mockSchemaQueryIdParseInt.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    const { req, res } = createMocks({
      method: "POST",
      query: { apiKey: "test_key", id: "1" },
      userId: 1,
    });

    await paymentById(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    // When method is not GET, the function returns early without setting status
    expect(res._getStatusCode()).toBe(200);
  });
});
