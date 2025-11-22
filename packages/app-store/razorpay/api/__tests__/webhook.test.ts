/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

vi.mock("@calcom/prisma", () => ({
    prisma: {
        payment: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
        booking: {
            update: vi.fn(),
        },
        $transaction: vi.fn((callback) => {
            if (typeof callback === 'function') {
                return callback({
                    payment: { update: vi.fn() },
                    booking: { update: vi.fn() }
                });
            }
            return Promise.all(callback);
        }),
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
import handler from "../webhook";
describe("Razorpay Webhook Handler", () => {
    let mockReq: Partial<NextApiRequest>;
    let mockRes: Partial<NextApiResponse>;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;
    const WEBHOOK_SECRET = "test_webhook_secret";
    const validPaymentCapturedEvent = {
        entity: "event",
        account_id: "acc_test123",
        event: "payment.captured",
        contains: ["payment"],
        payload: {
            payment: {
                entity: {
                    id: "pay_123",
                    entity: "payment",
                    amount: 50000,
                    currency: "INR",
                    status: "captured",
                    order_id: "order_123",
                    invoice_id: null,
                    international: false,
                    method: "card",
                    amount_refunded: 0,
                    refund_status: "null",
                    captured: true,
                    description: "Test payment",
                    card_id: null,
                    bank: null,
                    wallet: null,
                    vpa: null,
                    email: "test@example.com",
                    contact: "+919999999999",
                    customer_id: null,
                    token_id: null,
                    notes: {},
                    fee: 1000,
                    tax: 180,
                    error_code: null,
                    error_description: null,
                    error_source: null,
                    error_step: null,
                    error_reason: null,
                    acquirer_data: {},
                    created_at: 1234567890,
                },
            },
        },
        created_at: 1234567890,
    };
    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        delete process.env.RAZORPAY_WEBHOOK_SECRET;
        jsonMock = vi.fn();
        statusMock = vi.fn(() => ({ json: jsonMock }));
        mockReq = {
            method: "POST",
            headers: {},
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
            mockReq.headers = { "x-razorpay-signature": "test_signature" };
            mockReq.body = validPaymentCapturedEvent;
            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: "order_123",
                success: false,
                data: { orderId: "order_123" },
                booking: {
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test",
                                    key_secret: "secret",
                                    webhook_secret: WEBHOOK_SECRET,
                                },
                            },
                        ],
                    },
                },
            } as any);
            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
            expect(statusMock).not.toHaveBeenCalledWith(405);
        });
    });
    describe("Signature Verification", () => {
        it("should reject webhook without signature header", async () => {
            mockReq.body = validPaymentCapturedEvent;
            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Missing signature" });
        });
        it("should reject webhook with invalid signature", async () => {
            mockReq.headers = { "x-razorpay-signature": "invalid_signature" };
            mockReq.body = validPaymentCapturedEvent;
            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: "order_123",
                booking: {
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test",
                                    key_secret: "secret",
                                    webhook_secret: WEBHOOK_SECRET,
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
        it("should accept webhook with valid signature", async () => {
            const body = JSON.stringify(validPaymentCapturedEvent);
            const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
            mockReq.headers = { "x-razorpay-signature": validSignature };
            mockReq.body = validPaymentCapturedEvent;
            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: "order_123",
                bookingId: 1,
                success: false,
                data: { orderId: "order_123" },
                booking: {
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test",
                                    key_secret: "secret",
                                    webhook_secret: WEBHOOK_SECRET,
                                },
                            },
                        ],
                    },
                },
            } as any);
            vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
            vi.mocked(prisma.booking.update).mockResolvedValue({} as any);
            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ received: true });
        });
        it("should handle webhook secret from environment variable", async () => {
            // eslint-disable-next-line turbo/no-undeclared-env-vars
            process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
            const body = JSON.stringify(validPaymentCapturedEvent);
            const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
            mockReq.headers = { "x-razorpay-signature": validSignature };
            mockReq.body = validPaymentCapturedEvent;
            vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                id: 1,
                externalId: "order_123",
                bookingId: 1,
                success: false,
                data: { orderId: "order_123" },
                booking: {
                    user: {
                        credentials: [
                            {
                                key: {
                                    key_id: "rzp_test",
                                    key_secret: "secret",
                                    // No webhook_secret in credentials
                                },
                            },
                        ],
                    },
                },
            } as any);
            vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
            vi.mocked(prisma.booking.update).mockResolvedValue({} as any);
            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
            expect(statusMock).toHaveBeenCalledWith(200);
        });
    });
    describe("Webhook Event Processing", () => {
        beforeEach(() => {
            const body = JSON.stringify(validPaymentCapturedEvent);
            const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
            mockReq.headers = { "x-razorpay-signature": validSignature };
        });
        describe("payment.captured", () => {
            it("should respond 200 immediately for captured payment", async () => {
                mockReq.body = validPaymentCapturedEvent;
                vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                    id: 1,
                    externalId: "order_123",
                    bookingId: 100,
                    success: false,
                    data: { orderId: "order_123" },
                    booking: {
                        user: {
                            credentials: [
                                {
                                    key: {
                                        key_id: "rzp_test",
                                        key_secret: "secret",
                                        webhook_secret: WEBHOOK_SECRET,
                                    },
                                },
                            ],
                        },
                    },
                } as any);
                vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
                vi.mocked(prisma.booking.update).mockResolvedValue({} as any);
                await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
                expect(statusMock).toHaveBeenCalledWith(200);
                expect(jsonMock).toHaveBeenCalledWith(
                    expect.objectContaining({ received: true })
                );
            });
            it("should skip update if payment already captured", async () => {
                mockReq.body = validPaymentCapturedEvent;
                vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                    id: 1,
                    externalId: "order_123",
                    bookingId: 100,
                    success: true,
                    data: { orderId: "order_123", status: "captured", paymentId: "pay_123" },
                    booking: {
                        user: {
                            credentials: [
                                {
                                    key: {
                                        key_id: "rzp_test",
                                        key_secret: "secret",
                                        webhook_secret: WEBHOOK_SECRET,
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
        describe("payment.authorized", () => {
            it("should update payment data with authorized status", async () => {
                const authorizedEvent = {
                    ...validPaymentCapturedEvent,
                    event: "payment.authorized",
                    payload: {
                        payment: {
                            entity: {
                                ...validPaymentCapturedEvent.payload.payment.entity,
                                status: "authorized",
                                captured: false,
                            },
                        },
                    },
                };
                const body = JSON.stringify(authorizedEvent);
                const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
                mockReq.headers = { "x-razorpay-signature": validSignature };
                mockReq.body = authorizedEvent;
                vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                    id: 1,
                    externalId: "order_123",
                    success: false,
                    data: { orderId: "order_123" },
                    booking: {
                        user: {
                            credentials: [
                                {
                                    key: {
                                        key_id: "rzp_test",
                                        key_secret: "secret",
                                        webhook_secret: WEBHOOK_SECRET,
                                    },
                                },
                            ],
                        },
                    },
                } as any);
                vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
                await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
                await new Promise(resolve => setTimeout(resolve, 100));
                expect(prisma.payment.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            data: expect.objectContaining({
                                status: "authorized",
                            }),
                        }),
                    })
                );
            });
        });
        describe("payment.failed", () => {
            it("should update payment with failure details", async () => {
                const failedEvent = {
                    ...validPaymentCapturedEvent,
                    event: "payment.failed",
                    payload: {
                        payment: {
                            entity: {
                                ...validPaymentCapturedEvent.payload.payment.entity,
                                status: "failed",
                                error_code: "BAD_REQUEST_ERROR",
                                error_description: "Payment failed",
                                error_source: "customer",
                                error_step: "payment_authentication",
                                error_reason: "payment_failed",
                            },
                        },
                    },
                };
                const body = JSON.stringify(failedEvent);
                const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
                mockReq.headers = { "x-razorpay-signature": validSignature };
                mockReq.body = failedEvent;
                vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                    id: 1,
                    externalId: "order_123",
                    success: false,
                    data: { orderId: "order_123" },
                    booking: {
                        user: {
                            credentials: [
                                {
                                    key: {
                                        key_id: "rzp_test",
                                        key_secret: "secret",
                                        webhook_secret: WEBHOOK_SECRET,
                                    },
                                },
                            ],
                        },
                    },
                } as any);
                vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
                await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
                expect(prisma.payment.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({
                            success: false,
                            data: expect.objectContaining({
                                status: "failed",
                                errorCode: "BAD_REQUEST_ERROR",
                                errorDescription: "Payment failed",
                            }),
                        }),
                    })
                );
            });
        });
        describe("refund.processed", () => {
            it("should respond 200 for refund processed", async () => {
                const refundEvent = {
                    entity: "event",
                    account_id: "acc_test123",
                    event: "refund.processed",
                    contains: ["refund"],
                    payload: {
                        refund: {
                            entity: {
                                id: "rfnd_123",
                                entity: "refund",
                                amount: 50000,
                                currency: "INR",
                                payment_id: "pay_123",
                                notes: {},
                                receipt: null,
                                acquirer_data: {},
                                status: "processed",
                                speed_processed: "normal",
                                speed_requested: "normal",
                                created_at: 1234567890,
                            },
                        },
                    },
                    created_at: 1234567890,
                };
                const body = JSON.stringify(refundEvent);
                const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
                mockReq.headers = { "x-razorpay-signature": validSignature };
                mockReq.body = refundEvent;
                vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                    id: 1,
                    refunded: false,
                    externalId: "order_123",
                    data: { paymentId: "pay_123" },
                    booking: {
                        user: {
                            credentials: [
                                {
                                    key: {
                                        key_id: "rzp_test",
                                        key_secret: "secret",
                                        webhook_secret: WEBHOOK_SECRET,
                                    },
                                },
                            ],
                        },
                    },
                } as any);
                vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
                await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
                expect(statusMock).toHaveBeenCalledWith(200);
            });
        });
        describe("refund.failed", () => {
            it("should respond 200 for refund failed", async () => {
                const refundFailedEvent = {
                    entity: "event",
                    account_id: "acc_test123",
                    event: "refund.failed",
                    contains: ["refund"],
                    payload: {
                        refund: {
                            entity: {
                                id: "rfnd_123",
                                entity: "refund",
                                amount: 50000,
                                currency: "INR",
                                payment_id: "pay_123",
                                notes: {},
                                receipt: null,
                                acquirer_data: {},
                                status: "failed",
                                speed_processed: "normal",
                                speed_requested: "normal",
                                created_at: 1234567890,
                            },
                        },
                    },
                    created_at: 1234567890,
                };
                const body = JSON.stringify(refundFailedEvent);
                const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
                mockReq.headers = { "x-razorpay-signature": validSignature };
                mockReq.body = refundFailedEvent;
                vi.mocked(prisma.payment.findFirst).mockResolvedValue({
                    id: 1,
                    externalId: "order_123",
                    data: { paymentId: "pay_123" },
                    booking: {
                        user: {
                            credentials: [
                                {
                                    key: {
                                        key_id: "rzp_test",
                                        key_secret: "secret",
                                        webhook_secret: WEBHOOK_SECRET,
                                    },
                                },
                            ],
                        },
                    },
                } as any);
                vi.mocked(prisma.payment.update).mockResolvedValue({} as any);
                await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
                expect(statusMock).toHaveBeenCalledWith(200);
            });
        });
    });
    describe("Error Handling", () => {
        it("should handle invalid webhook event structure", async () => {
            mockReq.headers = { "x-razorpay-signature": "test_signature" };
            mockReq.body = { invalid: "data" };
            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
            // Invalid events return 500
            expect(statusMock).toHaveBeenCalledWith(500);
        });
        it("should handle database errors gracefully", async () => {
            const body = JSON.stringify(validPaymentCapturedEvent);
            const validSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
            mockReq.headers = { "x-razorpay-signature": validSignature };
            mockReq.body = validPaymentCapturedEvent;
            vi.mocked(prisma.payment.findFirst).mockRejectedValue(new Error("Database error"));
            await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);
            expect(statusMock).toHaveBeenCalledWith(200);
            // Database errors still return 200 but the response differs
        });
    });
});