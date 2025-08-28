import prisma from "../../../../../tests/libs/__mocks__/prismaMock";

import crypto from "crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";

import handleRazorpayPaymentRedirect from "../mocks/handleRazorpayPaymentRedirect.mock";

vi.mock("@calcom/lib/payment/handlePaymentSuccess", () => ({
  handlePaymentSuccess: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks(); // Reset mocks before each test
  vi.restoreAllMocks(); // Restore mocks to original implementations

  // Mock crypto.createHmac
  vi.spyOn(crypto, "createHmac").mockImplementation(() => {
    return {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue("valid_signature"),
    } as any;
  });
});

describe("handleRazorpayPaymentRedirect", () => {
  it("should return 'error' if the signature is invalid", async () => {
    vi.spyOn(crypto, "createHmac").mockImplementation(() => {
      return {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue("invalid_signature"), // Mocking an incorrect signature
      } as any;
    });

    const response = await handleRazorpayPaymentRedirect({
      razorpay_payment_id: "pay_123",
      razorpay_payment_link_id: "link_123",
      razorpay_signature: "wrong_signature",
      razorpay_payment_link_status: "paid",
      razorpay_payment_link_reference_id: "ref_123",
    });

    expect(response).toBe("error");
  });

  it("should return 'error' if required params are missing", async () => {
    const response = await handleRazorpayPaymentRedirect({
      razorpay_payment_id: "pay_123",
      razorpay_payment_link_id: "link_123",
      razorpay_signature: undefined, // Missing signature
      razorpay_payment_link_status: "paid",
      razorpay_payment_link_reference_id: "ref_123",
    });

    expect(response).toBe("error");
  });

  it("should return 'failed' if payment is not made", async () => {
    const response = await handleRazorpayPaymentRedirect({
      razorpay_payment_id: "pay_123",
      razorpay_payment_link_id: "link_123",
      razorpay_signature: "valid_signature",
      razorpay_payment_link_status: "pending", // Payment is not completed
      razorpay_payment_link_reference_id: "ref_123",
    });

    expect(response).toBe("failed");
  });

  it("should return 'error' if payment is not found in database", async () => {
    prisma.payment.findUnique.mockResolvedValue(null); // Simulating no payment found

    const response = await handleRazorpayPaymentRedirect({
      razorpay_payment_id: "pay_123",
      razorpay_payment_link_id: "link_123",
      razorpay_signature: "valid_signature",
      razorpay_payment_link_status: "paid",
      razorpay_payment_link_reference_id: "ref_123",
    });

    expect(response).toBe("error");
  });

  it("should return 'success' if payment is verified and processed", async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 123,
      bookingId: 456,
    } as any);

    (handlePaymentSuccess as jest.Mock).mockResolvedValue(undefined); // Mock handlePaymentSuccess properly

    const response = await handleRazorpayPaymentRedirect({
      razorpay_payment_id: "pay_123",
      razorpay_payment_link_id: "link_123",
      razorpay_signature: "valid_signature",
      razorpay_payment_link_status: "paid",
      razorpay_payment_link_reference_id: "ref_123",
    });
    console.log(response);
    expect(response).toBe("success");
  });
});
