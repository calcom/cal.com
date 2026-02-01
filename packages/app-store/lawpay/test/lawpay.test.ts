import { describe, it, expect, beforeEach, vi } from "vitest";
import { LawPayClient } from "../lib/client";
import { LawPayPaymentService } from "../lib/LawPayPaymentService";

describe("LawPay Integration", () => {
  describe("LawPayClient", () => {
    let client: LawPayClient;

    beforeEach(() => {
      client = new LawPayClient({
        access_token: "test_access_token",
        refresh_token: "test_refresh_token",
        client_id: "test_client_id",
        client_secret: "test_client_secret",
        public_key: "test_public_key",
        expires_at: Date.now() + 3600000, // 1 hour from now
      });
    });

    it("should create a client with valid credentials", () => {
      expect(client).toBeDefined();
    });

    it("should throw error with invalid credentials", () => {
      expect(() => {
        new LawPayClient({
          access_token: "",
          client_id: "",
          client_secret: "",
          public_key: "",
        });
      }).toThrow();
    });

    it("should create a payment", async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "pay_123",
          amount: 10000,
          currency: "USD",
          status: "succeeded",
        }),
      });

      const payment = await client.createPayment({
        amount: 100,
        currency: "usd",
        accountType: "operating",
        description: "Test payment",
      });

      expect(payment.id).toBe("pay_123");
      expect(payment.status).toBe("succeeded");
    });

    it("should refund a payment", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "refund_123",
          status: "refunded",
        }),
      });

      const refund = await client.refundPayment("pay_123");
      expect(refund.status).toBe("refunded");
    });

    it("should handle API errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({
          message: "Invalid payment amount",
        }),
      });

      await expect(
        client.createPayment({
          amount: -100,
          currency: "usd",
          accountType: "operating",
        })
      ).rejects.toThrow("LawPay API error");
    });
  });

  describe("LawPayPaymentService", () => {
    let service: LawPayPaymentService;

    beforeEach(() => {
      service = new LawPayPaymentService(
        {
          key: {
            access_token: "test_access_token",
            refresh_token: "test_refresh_token",
            client_id: "test_client_id",
            client_secret: "test_client_secret",
            public_key: "test_public_key",
            expires_at: Date.now() + 3600000,
          },
        },
        "ON_BOOKING"
      );
    });

    it("should initialize with valid credentials", () => {
      expect(service.isSetupAlready()).toBe(true);
    });

    it("should not initialize with invalid credentials", () => {
      const invalidService = new LawPayPaymentService(
        {
          key: {},
        },
        "ON_BOOKING"
      );
      expect(invalidService.isSetupAlready()).toBe(false);
    });

    it("should validate payment options", () => {
      expect(() => {
        new LawPayPaymentService(
          {
            key: {
              access_token: "test",
              client_id: "test",
              client_secret: "test",
              public_key: "test",
            },
          },
          "INVALID_OPTION"
        );
      }).toThrow();
    });
  });

  describe("Account Type Validation", () => {
    it("should accept operating account type", () => {
      const client = new LawPayClient({
        access_token: "test",
        client_id: "test",
        client_secret: "test",
        public_key: "test",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "pay_123", account_type: "operating" }),
      });

      expect(
        client.createPayment({
          amount: 100,
          currency: "usd",
          accountType: "operating",
        })
      ).resolves.toBeDefined();
    });

    it("should accept trust account type", () => {
      const client = new LawPayClient({
        access_token: "test",
        client_id: "test",
        client_secret: "test",
        public_key: "test",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "pay_123", account_type: "trust" }),
      });

      expect(
        client.createPayment({
          amount: 100,
          currency: "usd",
          accountType: "trust",
        })
      ).resolves.toBeDefined();
    });
  });
});
