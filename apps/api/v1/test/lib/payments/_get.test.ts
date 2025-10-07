import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import prisma from "@calcom/prisma";

import allPayments from "../../../pages/api/payments/index";

// Mock the withMiddleware function
vi.mock("~/lib/helpers/withMiddleware", () => ({
  withMiddleware: (_method: string) => (handler: unknown) => handler,
}));

// Mock prisma
vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  payment: { findMany: ReturnType<typeof vi.fn> };
};

describe("GET /api/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return 200 with payments array when payments exist", async () => {
    const mockUser = {
      id: 1,
      bookings: [{ id: 1 }, { id: 2 }],
    };

    const mockPayments = [
      {
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
      {
        id: 2,
        uid: "payment_456",
        amount: 3000,
        success: true,
        refunded: false,
        fee: 90,
        paymentOption: "ON_BOOKING",
        currency: "USD",
        bookingId: 2,
      },
    ];

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key" },
      userId: 1,
    });

    await allPayments(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      payments: [
        {
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
        {
          id: 2,
          uid: "payment_456",
          amount: 3000,
          success: true,
          refunded: false,
          fee: 90,
          paymentOption: "ON_BOOKING",
          currency: "USD",
          bookingId: 2,
        },
      ],
    });
  });

  it("should return 200 with empty array when no payments found", async () => {
    const mockUser = {
      id: 1,
      bookings: [{ id: 1 }],
    };

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.payment.findMany.mockResolvedValue([]);

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key" },
      userId: 1,
    });

    await allPayments(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      payments: [],
    });
  });

  it("should throw error when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key" },
      userId: 1,
    });

    await expect(
      allPayments(req as unknown as NextApiRequest, res as unknown as NextApiResponse)
    ).rejects.toThrow("No user found");
  });

  it("should include paymentUid (uid field) in response", async () => {
    const mockUser = {
      id: 1,
      bookings: [{ id: 1 }],
    };

    const mockPayments = [
      {
        id: 1,
        uid: "payment_abc123",
        amount: 5000,
        success: true,
        refunded: false,
        fee: 150,
        paymentOption: "ON_BOOKING",
        currency: "USD",
        bookingId: 1,
      },
    ];

    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

    const { req, res } = createMocks({
      method: "GET",
      query: { apiKey: "test_key" },
      userId: 1,
    });

    await allPayments(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.payments[0]).toHaveProperty("uid");
    expect(responseData.payments[0].uid).toBe("payment_abc123");
  });
});
