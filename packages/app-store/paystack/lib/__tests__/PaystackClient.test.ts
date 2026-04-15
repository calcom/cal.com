import { describe, it, expect, vi, beforeEach } from "vitest";

import { PaystackClient } from "../PaystackClient";

describe("PaystackClient", () => {
  let client: PaystackClient;

  beforeEach(() => {
    client = new PaystackClient("sk_test_xxxxx");
  });

  describe("initializeTransaction", () => {
    it("sends correct params and returns parsed response", async () => {
      const mockResponse = {
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: "https://checkout.paystack.com/abc123",
          access_code: "abc123",
          reference: "cal_42_ref123",
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await client.initializeTransaction({
        email: "test@example.com",
        amount: 500000,
        currency: "NGN",
        reference: "cal_42_ref123",
        callback_url: "https://cal.com/payment/callback",
        metadata: { bookingId: 42 },
      });

      expect(fetch).toHaveBeenCalledWith("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_xxxxx",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          amount: 500000,
          currency: "NGN",
          reference: "cal_42_ref123",
          callback_url: "https://cal.com/payment/callback",
          metadata: { bookingId: 42 },
        }),
      });

      expect(result).toEqual({
        authorization_url: "https://checkout.paystack.com/abc123",
        access_code: "abc123",
        reference: "cal_42_ref123",
      });
    });

    it("throws on API error response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ status: false, message: "Invalid amount" }),
        })
      );

      await expect(
        client.initializeTransaction({
          email: "test@example.com",
          amount: 0,
          currency: "NGN",
          reference: "cal_42_ref123",
          callback_url: "https://cal.com/payment/callback",
        })
      ).rejects.toThrow("Paystack API error: Invalid amount");
    });
  });

  describe("verifyTransaction", () => {
    it("returns parsed verification result", async () => {
      const mockResponse = {
        status: true,
        data: {
          status: "success",
          amount: 500000,
          currency: "NGN",
          reference: "cal_42_ref123",
          paid_at: "2026-04-04T12:00:00.000Z",
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await client.verifyTransaction("cal_42_ref123");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.paystack.co/transaction/verify/cal_42_ref123",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer sk_test_xxxxx",
          },
        }
      );

      expect(result).toEqual({
        status: "success",
        amount: 500000,
        currency: "NGN",
        reference: "cal_42_ref123",
        paid_at: "2026-04-04T12:00:00.000Z",
      });
    });
  });

  describe("createRefund", () => {
    it("sends refund request with transaction reference", async () => {
      const mockResponse = {
        status: true,
        data: {
          status: "pending",
          transaction: { reference: "cal_42_ref123" },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await client.createRefund({ transaction: "cal_42_ref123" });

      expect(fetch).toHaveBeenCalledWith("https://api.paystack.co/refund", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_xxxxx",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transaction: "cal_42_ref123" }),
      });

      expect(result.status).toBe(true);
    });
  });
});
