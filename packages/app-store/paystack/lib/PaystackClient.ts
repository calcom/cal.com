export const PAYSTACK_BASE_URL = "https://api.paystack.co";

const REQUEST_TIMEOUT_MS = 15_000;

type PaystackEnvelope<T> = {
  status?: boolean;
  message?: string;
  data?: T;
};

export class PaystackClient {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private async request<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown }
  ): Promise<PaystackEnvelope<T>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
    };
    if (init.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
        method: init.method,
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "network error";
      throw new Error(`Paystack API error: ${reason}`);
    }

    let json: PaystackEnvelope<T> | undefined;
    try {
      json = (await response.json()) as PaystackEnvelope<T>;
    } catch {
      json = undefined;
    }

    if (!response.ok || !json?.status) {
      const message = json?.message || `HTTP ${response.status} ${response.statusText}`.trim();
      throw new Error(`Paystack API error: ${message}`);
    }

    return json;
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
    const json = await this.request<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>("/transaction/initialize", { method: "POST", body: params });

    if (!json.data) {
      throw new Error("Paystack API error: missing transaction data");
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
    const json = await this.request<{
      status: string;
      amount: number;
      currency: string;
      reference: string;
      paid_at: string | null;
    }>(`/transaction/verify/${reference}`, { method: "GET" });

    if (!json.data) {
      throw new Error("Paystack API error: missing verification data");
    }
    return json.data;
  }

  async createRefund(params: {
    transaction: string;
    amount?: number;
  }): Promise<{ status: boolean; data: unknown }> {
    const json = await this.request<unknown>("/refund", { method: "POST", body: params });
    return { status: !!json.status, data: json.data };
  }
}
