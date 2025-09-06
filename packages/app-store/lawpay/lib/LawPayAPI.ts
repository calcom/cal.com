import * as crypto from "crypto";

import type { LawPayCredential, LawPayToken, LawPayCharge } from "../types";

export interface LawPayResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  [key: string]: unknown;
}

export class LawPayAPI {
  private credential: LawPayCredential;
  private baseUrl: string;
  private token?: LawPayToken;

  constructor(credential: LawPayCredential) {
    this.credential = credential;
    this.baseUrl =
      credential.environment === "production" ? "https://api.lawpay.com" : "https://api.sandbox.lawpay.com";
  }

  async authenticate(): Promise<LawPayToken> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${this.credential.client_id}:${this.credential.client_secret}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "transactions",
      }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json();

    if (!tokenData.access_token || !tokenData.expires_in) {
      throw new Error("Malformed token response");
    }

    this.token = {
      ...tokenData,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    } as LawPayToken;

    return this.token;
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.token || (this.token.expires_at && Date.now() >= this.token.expires_at)) {
      await this.authenticate();
    }
  }

  async createCharge(charge: LawPayCharge): Promise<LawPayResponse> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/v1/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token?.access_token}`,
        "X-LawPay-Account": this.credential.merchant_id,
      },
      body: JSON.stringify(charge),
    });

    if (!response.ok) {
      throw new Error(`Charge creation failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCharge(chargeId: string): Promise<LawPayResponse> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/v1/charges/${chargeId}`, {
      headers: {
        Authorization: `Bearer ${this.token?.access_token}`,
        "X-LawPay-Account": this.credential.merchant_id,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get charge: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async refundCharge(chargeId: string, amount?: number): Promise<LawPayResponse> {
    await this.ensureAuthenticated();

    const body: Record<string, unknown> = {};
    if (amount) {
      body.amount = amount;
    }

    const response = await fetch(`${this.baseUrl}/v1/charges/${chargeId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token?.access_token}`,
        "X-LawPay-Account": this.credential.merchant_id,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Refund failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.credential.secret_key;
      const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");

      // Ensure both signatures have the same length for timingSafeEqual
      if (signature.length !== expectedSignature.length) {
        return false;
      }

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (error) {
      return false;
    }
  }

  async createPaymentIntent(
    amount: number,
    currency = "USD",
    metadata?: Record<string, string>
  ): Promise<LawPayResponse> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/v1/payment_intents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token?.access_token}`,
        "X-LawPay-Account": this.credential.merchant_id,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Payment intent creation failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string): Promise<LawPayResponse> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.baseUrl}/v1/payment_intents/${paymentIntentId}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token?.access_token}`,
        "X-LawPay-Account": this.credential.merchant_id,
      },
      body: JSON.stringify({
        payment_method: paymentMethodId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Payment intent confirmation failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
