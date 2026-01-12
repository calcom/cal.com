/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Mock dependencies
vi.mock("@calcom/prisma", () => ({
    prisma: {
        payment: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock("@calcom/lib/logger", () => ({
    default: {
        getSubLogger: vi.fn(() => ({
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
        })),
    },
}));

import { prisma } from "@calcom/prisma";
import handler from "../verify";

describe("Razorpay Verify API", () => {
    let mockReq: Partial<NextApiRequest>;
    let mockRes: Partial<NextApiResponse>;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        jsonMock = vi.fn();
        statusMock = vi.fn(() => ({ json: jsonMock }));

        mockReq = {
            method: "POST",
            body: {},
        };

        mockRes = {
            status: statusMock as any,
        };
    });

    describe("HTTP Method Validation", () => {
        it("should reject non-POST requests", async () => {
            mockReq.method = "GET";

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(405);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Method not allowed" });
        });

        it("should accept POST requests", async () => {
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "valid_signature",
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).not.toHaveBeenCalledWith(405);
        });
    });

    describe("Request Validation", () => {
        it("should reject invalid request body", async () => {
            mockReq.body = {
                invalid_field: "value",
            };

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Invalid request" });
        });

        it("should reject request with missing fields", async () => {
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                // Missing other required fields
            };

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Invalid request" });
        });

        it("should accept request with all required fields", async () => {
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "signature_123",
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).not.toHaveBeenCalledWith(400);
        });
    });

    describe("Payment Lookup", () => {
        it("should return 404 when payment not found", async () => {
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "signature_123",
                paymentUid: "nonexistent_uid",
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Payment not found" });
        });

        it("should query payment by uid with correct structure", async () => {
            const paymentUid = "test_payment_uid";
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "signature_123",
                paymentUid,
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(prisma.payment.findFirst).toHaveBeenCalledWith({
                where: { uid: paymentUid },
                select: expect.objectContaining({
                    id: true,
                    externalId: true,
                    booking: expect.any(Object),
                }),
            });
        });
    });

    describe("Credentials Validation", () => {
        it("should return 500 when credentials not found", async () => {
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "signature_123",
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: "order_123",
                booking: {
                    uid: "booking_uid_123",
                    userId: 1,
                    user: {
                        credentials: [], // No credentials
                    },
                },
            } as any);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Credentials not found" });
        });

        it("should handle payment with valid credentials", async () => {
            const keySecret = "test_secret_key";
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "signature_123",
                paymentUid: "payment_uid_123",
            };

            const expectedSignature = crypto
                .createHmac("sha256", keySecret)
                .update("order_123|pay_123")
                .digest("hex");

            mockReq.body.razorpay_signature = expectedSignature;

            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: "order_123",
                booking: {
                    uid: "booking_uid_123",
                    userId: 1,
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test_123",
                                    key_secret: keySecret,
                                    default_currency: "inr",
                                },
                            },
                        ],
                    },
                },
            } as any);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                bookingUid: "booking_uid_123",
            });
        });
    });

    describe("Signature Verification", () => {
        it("should reject payment with invalid signature", async () => {
            const keySecret = "test_secret_key";
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "invalid_signature",
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: "order_123",
                booking: {
                    uid: "booking_uid_123",
                    userId: 1,
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test_123",
                                    key_secret: keySecret,
                                    default_currency: "inr",
                                },
                            },
                        ],
                    },
                },
            } as any);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Invalid signature" });
        });

        it("should accept payment with valid signature", async () => {
            const keySecret = "test_secret_key";
            const orderId = "order_123";
            const paymentId = "pay_123";

            const validSignature = crypto
                .createHmac("sha256", keySecret)
                .update(`${orderId}|${paymentId}`)
                .digest("hex");

            mockReq.body = {
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                razorpay_signature: validSignature,
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: orderId,
                booking: {
                    uid: "booking_uid_123",
                    userId: 1,
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test_123",
                                    key_secret: keySecret,
                                    default_currency: "inr",
                                },
                            },
                        ],
                    },
                },
            } as any);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                bookingUid: "booking_uid_123",
            });
        });

        it("should skip signature verification when key_secret is not provided", async () => {
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "any_signature",
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: "order_123",
                booking: {
                    uid: "booking_uid_123",
                    userId: 1,
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test_123",
                                    // No key_secret
                                    default_currency: "inr",
                                },
                            },
                        ],
                    },
                },
            } as any);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(200);
        });
    });

    describe("Success Response", () => {
        it("should return booking UID on successful verification", async () => {
            const keySecret = "test_secret_key";
            const orderId = "order_123";
            const paymentId = "pay_123";
            const bookingUid = "booking_uid_abc123";

            const validSignature = crypto
                .createHmac("sha256", keySecret)
                .update(`${orderId}|${paymentId}`)
                .digest("hex");

            mockReq.body = {
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                razorpay_signature: validSignature,
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: orderId,
                booking: {
                    uid: bookingUid,
                    userId: 1,
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test_123",
                                    key_secret: keySecret,
                                    default_currency: "inr",
                                },
                            },
                        ],
                    },
                },
            } as any);

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                bookingUid,
            });
        });
    });

    describe("Error Handling", () => {
        it("should handle database errors gracefully", async () => {
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "signature_123",
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockRejectedValue(new Error("Database error"));

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Verification failed" });
        });

        it("should handle unexpected errors", async () => {
            mockReq.body = {
                razorpay_payment_id: "pay_123",
                razorpay_order_id: "order_123",
                razorpay_signature: "signature_123",
                paymentUid: "payment_uid_123",
            };

            vi.mocked(prisma.payment.findFirst).mockRejectedValue("Unexpected error");

            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Verification failed" });
        });
    });
});
