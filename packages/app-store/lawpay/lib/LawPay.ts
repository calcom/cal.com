import { IS_PRODUCTION } from "@calcom/lib/constants";

interface LawPayCredentials {
  secretKey: string;
  accountId: string;
}

interface ChargeParams {
  amount: number;
  currency: string;
  tokenId: string;
  reference?: string;
}

interface ChargeResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  authorization_code?: string;
}

interface RefundResponse {
  id: string;
  status: string;
  amount: number;
}

class LawPay {
  private url: string;
  private secretKey: string;
  private accountId: string;

  constructor(credentials: LawPayCredentials) {
    this.url = IS_PRODUCTION ? "https://api.lawpay.com" : "https://api-sandbox.affinipay.com";
    this.secretKey = credentials.secretKey;
    this.accountId = credentials.accountId;
  }

  private async request<T>(method: string, endpoint: string, body?: object): Promise<T> {
    const auth = Buffer.from(`${this.secretKey}:`).toString("base64");
    const response = await fetch(`${this.url}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LawPay API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createCharge(params: ChargeParams): Promise<ChargeResponse> {
    return this.request<ChargeResponse>("POST", "/v1/charges", {
      amount: params.amount,
      account_id: this.accountId,
      method: params.tokenId,
      reference: params.reference,
      currency: params.currency,
    });
  }

  async refund(chargeId: string, amount: number): Promise<RefundResponse> {
    return this.request<RefundResponse>("POST", `/v1/charges/${chargeId}/refund`, { amount });
  }

  async voidTransaction(transactionId: string): Promise<{ id: string; status: string }> {
    return this.request("POST", `/v1/transactions/${transactionId}/void`, {});
  }

  async getTransaction(transactionId: string): Promise<ChargeResponse> {
    return this.request<ChargeResponse>("GET", `/v1/transactions/${transactionId}`);
  }

  async test(): Promise<boolean> {
    try {
      await this.request("GET", "/v1/merchant");
      return true;
    } catch {
      return false;
    }
  }
}

export default LawPay;
