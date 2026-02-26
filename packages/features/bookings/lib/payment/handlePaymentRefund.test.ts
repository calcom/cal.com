/**
 * Unit tests for handlePaymentRefund.
 *
 * Ensures correct payment app resolution by dirName, credential passing,
 * and behavior when app is missing or refund fails.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handlePaymentRefund } from "./handlePaymentRefund";

const { mockRefund, mockBuildPaymentService } = vi.hoisted(() => {
  const mockRefund = vi.fn();
  const mockBuildPaymentService = vi.fn(() => ({
    refund: mockRefund,
  }));
  return { mockRefund, mockBuildPaymentService };
});

vi.mock("@calcom/app-store/payment.services.generated", () => ({
  PaymentServiceMap: {
    stripepayment: Promise.resolve({
      BuildPaymentService: mockBuildPaymentService,
    }),
    paypal: Promise.resolve({
      BuildPaymentService: vi.fn(() => ({ refund: vi.fn() })),
    }),
  },
}));

describe("handlePaymentRefund", () => {
  const validCreds = {
    key: {},
    appId: "stripe",
    app: { dirName: "stripepayment", categories: ["payment"] as any },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefund.mockResolvedValue(true);
  });

  it("calls payment app BuildPaymentService and refund with paymentId", async () => {
    const result = await handlePaymentRefund(42, validCreds);

    expect(mockBuildPaymentService).toHaveBeenCalledWith(validCreds);
    expect(mockRefund).toHaveBeenCalledWith(42);
    expect(result).toBe(true);
  });

  it("returns false when app dirName is not in PaymentServiceMap", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await handlePaymentRefund(1, {
      ...validCreds,
      app: { dirName: "unknown-app", categories: [] },
    });

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("payment app not implemented")
    );
    consoleSpy.mockRestore();
  });

  it("returns refund result when refund resolves to false", async () => {
    mockRefund.mockResolvedValue(false);

    const result = await handlePaymentRefund(1, validCreds);

    expect(result).toBe(false);
  });

  it("propagates refund rejection", async () => {
    mockRefund.mockRejectedValue(new Error("Stripe API error"));

    await expect(handlePaymentRefund(1, validCreds)).rejects.toThrow("Stripe API error");
  });
});
