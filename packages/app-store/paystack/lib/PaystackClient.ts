const PAYSTACK_BASE_URL = "https://api.paystack.co";

export class PaystackClient {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async initializeTransaction(params: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callback_url: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const json = await response.json();

    if (!response.ok || !json.status) {
      throw new Error(`Paystack API error: ${json.message || "Unknown error"}`);
    }

    return json.data;
  }

  async verifyTransaction(reference: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    reference: string;
    paid_at: string | null;
  }> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    const json = await response.json();

    if (!response.ok || !json.status) {
      throw new Error(`Paystack API error: ${json.message || "Unknown error"}`);
    }

    return json.data;
  }

  async createRefund(params: {
    transaction: string;
    amount?: number;
  }): Promise<{ status: boolean; data: unknown }> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const json = await response.json();

    if (!response.ok || !json.status) {
      throw new Error(`Paystack API error: ${json.message || "Unknown error"}`);
    }

    return json;
  }
}
