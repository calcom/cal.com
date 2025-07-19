import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { LawPayAPI, PaymentService } from "./lib";
import type * as LawPayTypes from "./types";
import { lawPayCredentialSchema } from "./types";

type LawPayCredential = LawPayTypes.LawPayCredential;

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

describe("LawPay Integration", () => {
  const mockCredentials: LawPayCredential = {
    client_id: "test_client_id",
    client_secret: "test_client_secret",
    public_key: "test_public_key",
    secret_key: "test_secret_key",
    merchant_id: "test_merchant_id",
    environment: "sandbox",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("LawPayAPI", () => {
    let api: LawPayAPI;

    beforeEach(() => {
      api = new LawPayAPI(mockCredentials);
    });

    describe("constructor", () => {
      it("should set sandbox URL for sandbox environment", () => {
        const sandboxApi = new LawPayAPI({ ...mockCredentials, environment: "sandbox" });
        expect(sandboxApi["baseUrl"]).toBe("https://api.sandbox.lawpay.com");
      });

      it("should set production URL for production environment", () => {
        const productionApi = new LawPayAPI({ ...mockCredentials, environment: "production" });
        expect(productionApi["baseUrl"]).toBe("https://api.lawpay.com");
      });
    });

    describe("authenticate", () => {
      it("should successfully authenticate and return token", async () => {
        const mockToken = {
          access_token: "mock_access_token",
          token_type: "Bearer",
          expires_in: 3600,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockToken),
        });

        const result = await api.authenticate();

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.sandbox.lawpay.com/oauth/token",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: expect.stringContaining("Basic"),
            }),
          })
        );

        expect(result).toEqual(mockToken);
      });

      it("should throw error on authentication failure", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        });

        await expect(api.authenticate()).rejects.toThrow("Authentication failed: 401 Unauthorized");
      });
    });

    describe("createCharge", () => {
      const mockCharge = {
        amount: 10000,
        currency: "USD",
        description: "Test charge",
        method: {
          type: "card" as const,
          number: "4111111111111111",
          exp_month: 12,
          exp_year: 2025,
          cvv: "123",
          name: "John Doe",
        },
        account_id: "test_account",
        auto_capture: true,
      };

      beforeEach(() => {
        // Mock successful authentication
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "mock_token",
              token_type: "Bearer",
              expires_in: 3600,
            }),
        });
      });

      it("should create charge successfully", async () => {
        const mockChargeResponse = {
          id: "charge_123",
          amount: 10000,
          currency: "USD",
          status: "succeeded",
          created: Date.now(),
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockChargeResponse),
          });

        const result = await api.createCharge(mockCharge);

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.sandbox.lawpay.com/v1/charges",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: "Bearer mock_token",
              "X-LawPay-Account": "test_merchant_id",
            }),
            body: JSON.stringify(mockCharge),
          })
        );

        expect(result).toEqual(mockChargeResponse);
      });

      it("should throw error on charge creation failure", async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: "Bad Request",
          });

        await expect(api.createCharge(mockCharge)).rejects.toThrow("Charge creation failed: 400 Bad Request");
      });
    });

    describe("createPaymentIntent", () => {
      beforeEach(() => {
        // Mock successful authentication
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "mock_token",
              token_type: "Bearer",
              expires_in: 3600,
            }),
        });
      });

      it("should create payment intent successfully", async () => {
        const mockPaymentIntent = {
          id: "pi_123",
          amount: 10000,
          currency: "USD",
          status: "requires_payment_method",
          client_secret: "pi_123_secret",
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockPaymentIntent),
          });

        const result = await api.createPaymentIntent(100, "USD", { test: "metadata" });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.sandbox.lawpay.com/v1/payment_intents",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: "Bearer mock_token",
            }),
            body: JSON.stringify({
              amount: 10000, // Converted to cents
              currency: "USD",
              metadata: { test: "metadata" },
            }),
          })
        );

        expect(result).toEqual(mockPaymentIntent);
      });
    });

    describe("verifyWebhookSignature", () => {
      it("should return true for valid signature", () => {
        const payload = '{"event": "test"}';
        const expectedSignature = crypto
          .createHmac("sha256", mockCredentials.secret_key)
          .update(payload)
          .digest("hex");

        const result = api.verifyWebhookSignature(payload, expectedSignature);
        expect(result).toBe(true);
      });

      it("should return false for invalid signature", () => {
        const payload = '{"event": "test"}';
        const invalidSignature = "invalid_signature";

        const result = api.verifyWebhookSignature(payload, invalidSignature);
        expect(result).toBe(false);
      });
    });
  });

  describe("PaymentService", () => {
    let paymentService: PaymentService;

    beforeEach(() => {
      paymentService = new PaymentService({ key: mockCredentials });
    });

    describe("constructor", () => {
      it("should initialize with valid credentials", () => {
        expect(paymentService).toBeInstanceOf(PaymentService);
        expect(paymentService["credentials"]).toEqual(mockCredentials);
      });

      it("should handle invalid credentials", () => {
        const invalidService = new PaymentService({ key: { invalid: "data" } });
        expect(invalidService["credentials"]).toBeNull();
      });
    });

    describe("create", () => {
      const mockPayment = {
        amount: 10000,
        currency: "USD",
      };

      beforeEach(() => {
        // Mock successful authentication
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "mock_token",
              token_type: "Bearer",
              expires_in: 3600,
            }),
        });
      });

      it("should create payment successfully", async () => {
        const mockPaymentIntent = {
          id: "pi_123",
          amount: 10000,
          currency: "USD",
          status: "requires_payment_method",
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockPaymentIntent),
          });

        const result = await paymentService.create(
          mockPayment,
          1, // bookingId
          1, // userId
          "testuser",
          "Test User",
          "ON_BOOKING",
          "test@example.com",
          "+1234567890",
          "Test Event",
          "Test Booking"
        );

        expect(result).toEqual({
          id: 0, // parseInt(pi_123) || 0
          uid: "pi_123",
          bookingId: 1,
          success: false,
          refunded: false,
          amount: 10000,
          currency: "USD",
          data: mockPaymentIntent,
          externalId: "pi_123",
          fee: 0,
          paymentOption: "ON_BOOKING",
          appId: null,
        });
      });

      it("should throw error on payment creation failure", async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: "Bad Request",
          });

        await expect(
          paymentService.create(mockPayment, 1, 1, "testuser", "Test User", "ON_BOOKING", "test@example.com")
        ).rejects.toThrow("Failed to create LawPay payment");
      });
    });

    describe("collectCard", () => {
      const mockPayment = {
        amount: 10000,
        currency: "USD",
      };

      beforeEach(() => {
        // Mock successful authentication and payment intent creation
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "pi_collect_123",
                amount: 10000,
                currency: "USD",
                status: "requires_payment_method",
              }),
          });
      });

      it("should collect card payment successfully", async () => {
        const result = await paymentService.collectCard(mockPayment, 1, "HOLD", "test@example.com");

        expect(result).toEqual({
          id: 0,
          uid: "pi_collect_123",
          bookingId: 1,
          success: false,
          refunded: false,
          amount: 10000,
          currency: "USD",
          data: expect.any(Object),
          externalId: "pi_collect_123",
          fee: 0,
          paymentOption: "HOLD",
          appId: null,
        });
      });
    });

    describe("refund", () => {
      beforeEach(() => {
        // Mock successful authentication and refund
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "refund_123",
                amount: 10000,
                currency: "USD",
                status: "succeeded",
              }),
          });
      });

      it("should refund payment successfully", async () => {
        const result = await paymentService.refund(123);

        expect(result).toEqual({
          id: 123,
          uid: "refund_123",
          bookingId: 0,
          success: true,
          refunded: true,
          amount: 10000,
          currency: "USD",
          data: expect.any(Object),
          externalId: "refund_123",
          fee: 0,
          paymentOption: "ON_BOOKING",
          appId: null,
        });
      });
    });

    describe("isSetupAlready", () => {
      it("should return true when credentials are valid", () => {
        expect(paymentService.isSetupAlready()).toBe(true);
      });

      it("should return false when credentials are invalid", () => {
        const invalidService = new PaymentService({ key: null });
        expect(invalidService.isSetupAlready()).toBe(false);
      });
    });

    describe("getPaymentPaidStatus", () => {
      it("should return 'paid' status", async () => {
        const result = await paymentService.getPaymentPaidStatus();
        expect(result).toBe("paid");
      });
    });

    describe("afterPayment", () => {
      it("should handle post-payment logic", async () => {
        const mockEvent = { title: "Test Event" };
        const mockBooking = {
          user: { email: "test@example.com", name: "Test User", timeZone: "UTC" },
          id: 1,
          startTime: { toISOString: () => "2023-01-01T00:00:00.000Z" },
          uid: "booking_123",
        };
        const mockPaymentData = {
          id: 1,
          uid: "payment_123",
          bookingId: 1,
          success: true,
          refunded: false,
          amount: 10000,
          currency: "USD",
          data: {},
          externalId: "ext_123",
          fee: 0,
          paymentOption: "ON_BOOKING" as const,
          appId: null,
        };

        // Should not throw any errors
        await expect(
          paymentService.afterPayment(mockEvent as CalendarEvent, mockBooking, mockPaymentData)
        ).resolves.toBeUndefined();

        expect(mockConsoleLog).toHaveBeenCalledWith("LawPay payment completed:", {
          event: "Test Event",
          booking: 1,
          payment: 1,
        });
      });
    });

    describe("deletePayment", () => {
      beforeEach(() => {
        // Mock successful authentication and refund (since delete = refund)
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "refund_123",
                status: "succeeded",
              }),
          });
      });

      it("should delete payment successfully by refunding", async () => {
        const result = await paymentService.deletePayment(123);
        expect(result).toBe(true);
      });

      it("should return false on delete failure", async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ access_token: "mock_token" }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
          });

        const result = await paymentService.deletePayment(123);
        expect(result).toBe(false);
        expect(mockConsoleError).toHaveBeenCalled();
      });
    });
  });

  describe("Type Validation", () => {
    it("should validate LawPay credentials schema", () => {
      const validCredentials = {
        client_id: "test_id",
        client_secret: "test_secret",
        public_key: "test_public",
        secret_key: "test_secret_key",
        merchant_id: "test_merchant",
        environment: "sandbox" as const,
      };

      const result = lawPayCredentialSchema.safeParse(validCredentials);
      expect(result.success).toBe(true);
    });

    it("should reject invalid credentials", () => {
      const invalidCredentials = {
        client_id: "test_id",
        // missing required fields
      };

      const result = lawPayCredentialSchema.safeParse(invalidCredentials);
      expect(result.success).toBe(false);
    });
  });
});
