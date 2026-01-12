/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { prisma } from "@calcom/prisma";
import { PaymentService } from "../PaymentService";
// Create mock functions
const mockOrdersCreate = vi.fn();
const mockOrdersFetchPayments = vi.fn();
const mockPaymentsCapture = vi.fn();
const mockPaymentsRefund = vi.fn();
// Mock Razorpay constructor
const MockRazorpay = vi.fn().mockImplementation(() => ({
    orders: {
        create: mockOrdersCreate,
        fetchPayments: mockOrdersFetchPayments,
    },
    payments: {
        capture: mockPaymentsCapture,
        refund: mockPaymentsRefund,
    },
}));
vi.mock("razorpay", () => MockRazorpay);
vi.mock("@calcom/prisma", () => ({
    prisma: {
        payment: {
            create: vi.fn(),
            update: vi.fn(),
            findFirst: vi.fn(),
            delete: vi.fn(),
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
vi.mock("@calcom/emails/email-manager", () => ({
    sendAwaitingPaymentEmailAndSMS: vi.fn(),
}));
describe("Razorpay PaymentService", () => {
    let paymentService: PaymentService;
    const validCredentials = {
        key: {
            key_id: "rzp_test_123",
            key_secret: "test_secret_key",
            default_currency: "inr",
        },
    };
    beforeEach(() => {
        vi.clearAllMocks();
        paymentService = new PaymentService(validCredentials);
    });
    describe("Service Initialization", () => {
        it("should initialize with valid credentials", () => {
            expect(paymentService.isSetupAlready()).toBe(true);
        });
        it("should handle invalid credentials gracefully", () => {
            const invalidService = new PaymentService({
                key: "invalid_credentials",
            } as any);
            expect(invalidService.isSetupAlready()).toBe(false);
        });
    });
    describe("create - Payment Creation", () => {
        it("should throw error for incompatible payment option", async () => {
            await expect(
                paymentService.create(
                    { amount: 500, currency: "inr" },
                    100,
                    1,
                    "test_user",
                    "Test Booker",
                    "HOLD" as any,
                    "booker@example.com"
                )
            ).rejects.toThrow("payment_not_created_error");
        });
        it("should throw error when credentials are missing", async () => {
            const serviceWithoutCreds = new PaymentService({
                key: "invalid",
            } as any);
            await expect(
                serviceWithoutCreds.create(
                    { amount: 500, currency: "inr" },
                    100,
                    1,
                    "test_user",
                    "Test Booker",
                    "ON_BOOKING",
                    "booker@example.com"
                )
            ).rejects.toThrow("payment_not_created_error");
        });
        it("should handle Razorpay API errors", async () => {
            mockOrdersCreate.mockRejectedValue(new Error("API Error"));
            await expect(
                paymentService.create(
                    { amount: 500, currency: "inr" },
                    100,
                    1,
                    "test_user",
                    "Test Booker",
                    "ON_BOOKING",
                    "booker@example.com"
                )
            ).rejects.toThrow("payment_not_created_error");
        });
    });
    describe("collectCard - Payment Method Collection", () => {
        it("should throw error for incompatible payment option", async () => {
            await expect(
                paymentService.collectCard(
                    { amount: 500, currency: "inr" },
                    100,
                    "ON_BOOKING",
                    "booker@example.com"
                )
            ).rejects.toThrow("Razorpay: Payment method could not be collected");
        });
    });
    describe("chargeCard - Payment Capture", () => {
        it("should throw error when no payments found", async () => {
            mockOrdersFetchPayments.mockResolvedValue({ items: [] });
            const payment = {
                id: 1,
                currency: "inr",
                data: {
                    orderId: "order_123",
                    amount: 50000,
                },
            };
            await expect(paymentService.chargeCard(payment as any, 100)).rejects.toThrow(
                "could_not_charge_card"
            );
        });
    });
    describe("refund - Payment Refund", () => {
        it("should return null for non-existent payment", async () => {
            vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);
            const result = await paymentService.refund(999);
            expect(result).toBeNull();
        });
        it("should throw error for failed payment refund", async () => {
            const mockPayment = {
                id: 1,
                success: false,
                refunded: false,
                externalId: "order_123",
            };
            vi.mocked(prisma.payment.findFirst).mockResolvedValue(mockPayment as any);
            await expect(paymentService.refund(1)).rejects.toThrow("Unable to refund failed payment");
        });
        it("should return payment if already refunded", async () => {
            const mockPayment = {
                id: 1,
                success: true,
                refunded: true,
                externalId: "order_123",
            };
            vi.mocked(prisma.payment.findFirst).mockResolvedValue(mockPayment as any);
            const result = await paymentService.refund(1);
            expect(result).toEqual(mockPayment);
            expect(mockPaymentsRefund).not.toHaveBeenCalled();
        });
    });
    describe("verifyPaymentSignature - Signature Verification", () => {
        it("should verify valid payment signature", () => {
            const orderId = "order_123";
            const paymentId = "pay_123";
            const keySecret = "test_secret_key";
            const body = `${orderId}|${paymentId}`;
            const expectedSignature = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
            const result = paymentService.verifyPaymentSignature(orderId, paymentId, expectedSignature);
            expect(result).toBe(true);
        });
        it("should reject invalid payment signature", () => {
            const result = paymentService.verifyPaymentSignature(
                "order_123",
                "pay_123",
                "invalid_signature"
            );
            expect(result).toBe(false);
        });
        it("should throw error when credentials are missing", () => {
            const serviceWithoutCreds = new PaymentService({
                key: "invalid",
            } as any);
            expect(() => {
                serviceWithoutCreds.verifyPaymentSignature("order_123", "pay_123", "signature");
            }).toThrow("Razorpay credentials not found");
        });
    });
    describe("deletePayment - Payment Deletion", () => {
        it("should delete payment successfully", async () => {
            const mockPayment = {
                id: 1,
                externalId: "order_123",
            };
            vi.mocked(prisma.payment.findFirst).mockResolvedValue(mockPayment as any);
            vi.mocked(prisma.payment.delete).mockResolvedValue({} as any);
            const result = await paymentService.deletePayment(1);
            expect(result).toBe(true);
            expect(prisma.payment.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });
        it("should return false when payment not found", async () => {
            vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);
            const result = await paymentService.deletePayment(999);
            expect(result).toBe(false);
            expect(prisma.payment.delete).not.toHaveBeenCalled();
        });
        it("should handle deletion errors gracefully", async () => {
            const mockPayment = {
                id: 1,
                externalId: "order_123",
            };
            vi.mocked(prisma.payment.findFirst).mockResolvedValue(mockPayment as any);
            vi.mocked(prisma.payment.delete).mockRejectedValue(new Error("Delete error"));
            const result = await paymentService.deletePayment(1);
            expect(result).toBe(false);
        });
    });
});