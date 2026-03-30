import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  extractPeriodStartFromInvoice,
  validateInvoiceLinesForHwm,
  handleHwmResetAfterRenewal,
} from "./hwm-webhook-utils";

// Mock dependencies
vi.mock("@calcom/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: vi.fn(() => ({
    handleSubscriptionUpdate: vi.fn(),
    getSubscription: vi.fn(),
  })),
}));

const mockResetSubscriptionAfterRenewal = vi.fn();

vi.mock("@calcom/features/ee/billing/service/highWaterMark/HighWaterMarkService", () => {
  return {
    HighWaterMarkService: class MockHighWaterMarkService {
      resetSubscriptionAfterRenewal = mockResetSubscriptionAfterRenewal;
    },
  };
});

// Create a mock logger
const createMockLogger = () => ({
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
});

describe("hwm-webhook-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractPeriodStartFromInvoice", () => {
    it("returns undefined for empty array", () => {
      const result = extractPeriodStartFromInvoice([]);
      expect(result).toBeUndefined();
    });

    it("returns undefined for null/undefined input", () => {
      // @ts-expect-error - testing edge case
      expect(extractPeriodStartFromInvoice(null)).toBeUndefined();
      // @ts-expect-error - testing edge case
      expect(extractPeriodStartFromInvoice(undefined)).toBeUndefined();
    });

    it("returns undefined when first item has no period", () => {
      const result = extractPeriodStartFromInvoice([{}]);
      expect(result).toBeUndefined();
    });

    it("returns undefined when period has no start", () => {
      // @ts-expect-error - testing edge case
      const result = extractPeriodStartFromInvoice([{ period: { end: 1234567890 } }]);
      expect(result).toBeUndefined();
    });

    it("returns period start when valid", () => {
      const timestamp = 1704067200; // 2024-01-01 00:00:00 UTC
      const result = extractPeriodStartFromInvoice([
        { period: { start: timestamp, end: timestamp + 86400 } },
      ]);
      expect(result).toBe(timestamp);
    });

    it("returns first item period start when multiple items exist", () => {
      const firstTimestamp = 1704067200;
      const secondTimestamp = 1704153600;
      const result = extractPeriodStartFromInvoice([
        { period: { start: firstTimestamp, end: firstTimestamp + 86400 } },
        { period: { start: secondTimestamp, end: secondTimestamp + 86400 } },
      ]);
      expect(result).toBe(firstTimestamp);
    });
  });

  describe("validateInvoiceLinesForHwm", () => {
    it("returns invalid for empty array and logs warning", () => {
      const mockLog = createMockLogger();
      // @ts-expect-error - mock logger
      const result = validateInvoiceLinesForHwm([], "sub_123", mockLog);

      expect(result.isValid).toBe(false);
      expect(result.periodStart).toBeUndefined();
      expect(mockLog.warn).toHaveBeenCalledWith(
        "Invoice has no line items for subscription sub_123, cannot process HWM"
      );
    });

    it("returns invalid for null input and logs warning", () => {
      const mockLog = createMockLogger();
      // @ts-expect-error - testing edge case
      const result = validateInvoiceLinesForHwm(null, "sub_456", mockLog);

      expect(result.isValid).toBe(false);
      expect(mockLog.warn).toHaveBeenCalled();
    });

    it("returns invalid when period.start is missing and logs warning", () => {
      const mockLog = createMockLogger();
      // @ts-expect-error - mock logger
      const result = validateInvoiceLinesForHwm([{ period: undefined }], "sub_789", mockLog);

      expect(result.isValid).toBe(false);
      expect(result.periodStart).toBeUndefined();
      expect(mockLog.warn).toHaveBeenCalledWith(
        "Invoice line item missing period.start for subscription sub_789, cannot process HWM"
      );
    });

    it("returns valid with periodStart when data is correct", () => {
      const mockLog = createMockLogger();
      const timestamp = 1704067200;
      const result = validateInvoiceLinesForHwm(
        [{ period: { start: timestamp, end: timestamp + 86400 } }],
        "sub_valid",
        // @ts-expect-error - mock logger
        mockLog
      );

      expect(result.isValid).toBe(true);
      expect(result.periodStart).toBe(timestamp);
      expect(mockLog.warn).not.toHaveBeenCalled();
    });
  });

  describe("handleHwmResetAfterRenewal", () => {
    it("returns failure when periodStartTimestamp is undefined", async () => {
      const mockLog = createMockLogger();
      // @ts-expect-error - mock logger
      const result = await handleHwmResetAfterRenewal("sub_123", undefined, mockLog);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No period start timestamp");
      expect(mockLog.warn).toHaveBeenCalledWith(
        "No period start timestamp for subscription sub_123, skipping HWM reset"
      );
      expect(mockResetSubscriptionAfterRenewal).not.toHaveBeenCalled();
    });

    it("returns success when reset succeeds", async () => {
      const mockLog = createMockLogger();
      mockResetSubscriptionAfterRenewal.mockResolvedValue(true);

      const timestamp = 1704067200;
      // @ts-expect-error - mock logger
      const result = await handleHwmResetAfterRenewal("sub_456", timestamp, mockLog);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(true);
      expect(mockResetSubscriptionAfterRenewal).toHaveBeenCalledWith({
        subscriptionId: "sub_456",
        newPeriodStart: new Date(timestamp * 1000),
      });
      expect(mockLog.info).toHaveBeenCalled();
    });

    it("returns success with updated=false when no update needed", async () => {
      const mockLog = createMockLogger();
      mockResetSubscriptionAfterRenewal.mockResolvedValue(false);

      const timestamp = 1704067200;
      // @ts-expect-error - mock logger
      const result = await handleHwmResetAfterRenewal("sub_789", timestamp, mockLog);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(false);
    });

    it("returns failure when reset throws an error", async () => {
      const mockLog = createMockLogger();
      mockResetSubscriptionAfterRenewal.mockRejectedValue(new Error("Stripe API error"));

      const timestamp = 1704067200;
      // @ts-expect-error - mock logger
      const result = await handleHwmResetAfterRenewal("sub_error", timestamp, mockLog);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Stripe API error");
      expect(mockLog.error).toHaveBeenCalledWith("Failed to reset HWM after invoice paid", {
        subscriptionId: "sub_error",
        error: "Stripe API error",
      });
    });

    it("handles non-Error thrown values", async () => {
      const mockLog = createMockLogger();
      mockResetSubscriptionAfterRenewal.mockRejectedValue("string error");

      const timestamp = 1704067200;
      // @ts-expect-error - mock logger
      const result = await handleHwmResetAfterRenewal("sub_string", timestamp, mockLog);

      expect(result.success).toBe(false);
      expect(result.error).toBe("string error");
    });
  });
});
