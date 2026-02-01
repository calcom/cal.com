import { z } from "zod";

const lawpayCredentialsSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  client_id: z.string(),
  client_secret: z.string(),
  public_key: z.string(),
  expires_at: z.number().optional(),
});

export type LawPayCredentials = z.infer<typeof lawpayCredentialsSchema>;

export class LawPayClient {
  private credentials: LawPayCredentials;
  private baseUrl: string;

  constructor(credentials: LawPayCredentials) {
    this.credentials = lawpayCredentialsSchema.parse(credentials);
    this.baseUrl = process.env.LAWPAY_API_URL || "https://api.lawpay.com";
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.credentials.refresh_token) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: this.credentials.refresh_token,
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    const data = await response.json();
    this.credentials.access_token = data.access_token;
    this.credentials.expires_at = Date.now() + data.expires_in * 1000;

    return data.access_token;
  }

  private async getValidAccessToken(): Promise<string> {
    // Check if token is expired or about to expire (within 5 minutes)
    if (this.credentials.expires_at && this.credentials.expires_at < Date.now() + 5 * 60 * 1000) {
      return await this.refreshAccessToken();
    }

    return this.credentials.access_token;
  }

  async createPayment(params: {
    amount: number;
    currency: string;
    accountType: "operating" | "trust";
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: Math.round(params.amount * 100), // Convert to cents
        currency: params.currency.toUpperCase(),
        account_type: params.accountType,
        description: params.description,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LawPay API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async getPayment(paymentId: string) {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get payment: ${response.statusText}`);
    }

    return await response.json();
  }

  async refundPayment(paymentId: string, amount?: number) {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: amount ? Math.round(amount * 100) : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LawPay refund error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async capturePayment(paymentId: string) {
    const accessToken = await this.getValidAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/payments/${paymentId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LawPay capture error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async listPayments(params?: { limit?: number; starting_after?: string }) {
    const accessToken = await this.getValidAccessToken();

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.starting_after) queryParams.append("starting_after", params.starting_after);

    const response = await fetch(`${this.baseUrl}/v2/payments?${queryParams}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list payments: ${response.statusText}`);
    }

    return await response.json();
  }
}
