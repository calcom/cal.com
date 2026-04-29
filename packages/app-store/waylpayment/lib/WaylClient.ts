const WAYL_BASE_URL = "https://api.thewayl.com/api/v1";

// Statuses visible on the link object (from API response)
export type WaylLinkStatus = "FullPaymentLink" | "Pending" | "Processing" | "Complete" | "Expired" | "Invalid" | "Cancelled";

export interface WaylLineItem {
  label: string;
  amount: number; // in IQD
  type: "increase" | "decrease"; // increase = charge, decrease = discount
}

export interface CreateLinkParams {
  /** Your internal booking UID — returned verbatim in the webhook as referenceId */
  referenceId: string;
  /** Total amount in IQD. Must equal the sum of all lineItem amounts (after increase/decrease). */
  total: number;
  currency: "IQD";
  lineItem: WaylLineItem[];
  /** Wayl will POST the payment result to this URL */
  webhookUrl: string;
  /**
   * A secret YOU generate. Wayl uses it to sign the webhook so you can verify
   * the request came from Wayl. Store this alongside the Payment record.
   */
  webhookSecret: string;
  /** Customer is redirected here after payment completes */
  redirectionUrl: string;
}

/** Shape of the link object returned by POST /api/v1/links → data */
export interface WaylLink {
  referenceId: string;    // your booking UID
  id: string;             // Wayl's internal order ID
  code: string;           // Wayl's order code
  url: string;            // hosted payment page — redirect customer here
  total: string;
  currency: string;
  status: WaylLinkStatus;
  paymentMethod: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  webhookUrl: string;
  redirectionUrl: string;
}

/** Shape of the webhook POST body Wayl sends to your webhookUrl after payment */
export interface WaylWebhookPayload {
  verb: string;
  event: string;          // "order.created" on successful payment
  referenceId: string;    // your booking UID
  paymentMethod: string;
  paymentStatus: string;
  paymentProcessor: string;
  total: number;
  commission: number;
  code: string;
  id: string;             // Wayl's internal order ID
  customer: {
    id: string;
    name: string;
    phone: string;
    city: string;
    country: string;
    address: string;
  };
  items: WaylLineItem[];
}

class WaylClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      "X-WAYL-AUTHENTICATION": this.apiKey,
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${WAYL_BASE_URL}${path}`, {
      ...options,
      headers: { ...this.headers(), ...(options.headers ?? {}) },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const message = json?.message ?? `Wayl API error: ${res.status}`;
      throw new Error(message);
    }

    return json;
  }

  /** Verify the API key is valid — call this when the user first saves their key */
  async verifyKey(): Promise<boolean> {
    try {
      await this.request("/verify-auth-key");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a hosted payment link.
   * Returns the link object including the `url` to redirect the customer to.
   *
   * IMPORTANT: The `webhookSecret` in the params is a secret you generate.
   * Store it in Payment.data — you will need it to verify the incoming webhook.
   */
  async createLink(params: CreateLinkParams): Promise<WaylLink> {
    const res = await this.request<{ data: WaylLink; message: string; success: boolean }>(
      "/links",
      {
        method: "POST",
        body: JSON.stringify({
          referenceId: params.referenceId,
          total: params.total,
          currency: params.currency,
          lineItem: params.lineItem,
          webhookUrl: params.webhookUrl,
          webhookSecret: params.webhookSecret,
          redirectionUrl: params.redirectionUrl,
        }),
      }
    );
    return res.data;
  }

  /** Fetch a link by your referenceId */
  async getLinkByReference(referenceId: string): Promise<WaylLink> {
    const res = await this.request<{ data: WaylLink; message: string }>(
      `/links/${referenceId}`
    );
    return res.data;
  }

  /**
   * Invalidate a link only if it hasn't been paid yet.
   * Safe to call on cancellation — won't error if already paid.
   */
  async invalidateLinkIfPending(referenceId: string): Promise<void> {
    await this.request(`/links/${referenceId}/invalidate-if-pending`, {
      method: "POST",
    });
  }

  /** Submit a refund request. Reason must be at least 100 characters. */
  async createRefund(params: { referenceId: string; reason: string }): Promise<void> {
    await this.request("/refunds", {
      method: "POST",
      body: JSON.stringify({
        referenceId: params.referenceId,
        reason: params.reason,
      }),
    });
  }
}

export default WaylClient;
