import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";

class Paypal {
  url: string;
  clientId: string;
  secretKey: string;
  accessToken: string | null = null;
  expiresAt: number | null = null;

  constructor({ clientId, secretKey }: { clientId: string; secretKey: string }) {
    this.url = IS_PRODUCTION ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    this.clientId = clientId;
    this.secretKey = secretKey;
  }

  async getAccessToken(): Promise<void> {
    if (this.accessToken && this.expiresAt && this.expiresAt > Date.now()) {
      return;
    }
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.secretKey}`).toString("base64")}`,
    };

    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");

    try {
      const response = await fetch(`${this.url}/v1/oauth2/token`, {
        method: "POST",
        headers,
        body,
      });
      if (response.ok) {
        const { access_token, expires_in } = await response.json();
        this.accessToken = access_token;
        this.expiresAt = Date.now() + expires_in;
      } else {
        console.error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Orders
  async createOrder({
    referenceId,
    amount,
    currency,
    returnUrl,
    intent = "CAPTURE",
  }: {
    referenceId: string;
    amount: number;
    currency: string;
    returnUrl: string;
    intent?: "CAPTURE" | "AUTHORIZE";
  }): Promise<CreateOrderResponse> {
    // Always get a new access token
    await this.getAccessToken();

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      "PayPal-Request-Id": uuidv4(),
    };

    const createOrderRequestBody: CreateOrderRequestBody = {
      intent,
      purchase_units: [
        {
          reference_id: referenceId,
          amount: {
            currency_code: currency,
            value: (amount / 100).toString(),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: returnUrl,
          },
        },
      },
    };

    try {
      const response = await fetch(`${this.url}/v2/checkout/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(createOrderRequestBody),
      });

      if (response.ok) {
        const createOrderResponse: CreateOrderResponse = await response.json();
        return createOrderResponse;
      } else {
        console.error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error(error);
    }
    return {} as CreateOrderResponse;
  }

  async getOrder(): Promise<any> {
    console.log("Paypal update");
  }

  async updateOrder(): Promise<any> {
    console.log("Paypal refund");
  }

  async confirmOrder(): Promise<any> {
    console.log("Paypal confirm order");
  }

  async captureOrder(): Promise<any> {
    console.log("Paypal capture order");
  }

  async authorizeOrder(): Promise<any> {
    console.log("Paypal authorize order");
  }

  // Payments
  async getPayment(): Promise<any> {
    console.log("Paypal get payment");
  }

  async capturePayment(): Promise<any> {
    console.log("Paypal capture payment");
  }

  async reauthorizePayment(): Promise<any> {
    console.log("Paypal reauthorize payment");
  }

  async voidPayment(): Promise<any> {
    console.log("Paypal void payment");
  }

  async showCapturedPayment(): Promise<any> {
    console.log("Paypal show captured payment");
  }

  async refundCapturedPayment(): Promise<any> {
    console.log("Paypal refund captured payment");
  }

  async showRefundDetails(): Promise<any> {
    console.log("Paypal show refund details");
  }

  async createWebhooks(): Promise<boolean> {
    // Always get a new access token
    await this.getAccessToken();

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };

    const body = {
      url: `https://29c2-177-228-110-113.ngrok-free.app/api/integrations/paypal/webhook`,
      event_types: [
        {
          name: "PAYMENT.CAPTURE.COMPLETED",
        },
        {
          name: "PAYMENT.CAPTURE.REFUNDED",
        },
        {
          name: "PAYMENT.CAPTURE.REVERSED",
        },
      ],
    };

    try {
      const response = await fetch(`${this.url}/v1/notifications/webhooks`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      console.error(error);
    }

    return false;
  }

  async listWebhooks(): Promise<string[]> {
    // Always get a new access token
    await this.getAccessToken();

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };

    try {
      const response = await fetch(`${this.url}/v1/notifications/webhooks`, {
        method: "GET",
        headers,
      });

      if (response.ok) {
        const { webhooks } = await response.json();
        console.log({ webhooks });
        return webhooks.map((webhook: { id: string }) => webhook.id);
      }
    } catch (error) {
      console.error(error);
      return [];
    }
    return [];
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    // Always get a new access token
    await this.getAccessToken();

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };

    try {
      const response = await fetch(`${this.url}/v1/notifications/webhooks/${webhookId}`, {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      console.error(error);
    }
    return false;
  }

  async test(): Promise<boolean> {
    // Always get a new access token
    try {
      await this.getAccessToken();
    } catch (error) {
      console.error(error);
      return false;
    }
    return true;
  }

  async verify(options: Partial<any> = {}) {
    options.uri = "/v1/notifications/verify-webhook-signature";
    const parseRequest = webhookEventVerifyRequestSchema.safeParse(options);

    // Webhook event should be parsable
    if (!parseRequest.success) {
      throw new Error("Request is malformed");
    }

    const stringy = JSON.stringify({
      auth_algo: options.body.auth_algo,
      cert_url: options.body.cert_url,
      transmission_id: options.body.transmission_id,
      transmission_sig: options.body.transmission_sig,
      transmission_time: options.body.transmission_time,
      webhook_id: options.body.webhook_id,
    });

    options.body = stringy.slice(0, -1) + `,"webhook_event":${options.body.webhook_event}` + "}";
    try {
      const response = await fetch(options.uri, {
        method: "POST",
        headers: options.headers,
      });
      if (!response.ok) {
        throw response;
      }
      const data = await response.json();
      const parsedResponse = JSON.parse(data);
      if (parsedResponse.verification_status !== "SUCCESS") {
        throw parsedResponse;
      }
      return parsedResponse;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

export default Paypal;

interface PurchaseUnit {
  amount: {
    currency_code: string;
    value: string;
  };
  reference_id: string;
}

interface ExperienceContext {
  payment_method_preference?: string;
  payment_method_selected?: string;
  brand_name?: string;
  locale?: string;
  landing_page?: string;
  shipping_preference?: string;
  user_action: string;
  return_url: string;
  cancel_url: string;
}

interface PaymentSource {
  paypal: {
    experience_context: ExperienceContext;
  };
}

interface CreateOrderRequestBody {
  purchase_units: PurchaseUnit[];
  intent: string;
  payment_source?: PaymentSource;
}

interface Link {
  href: string;
  rel: string;
  method: string;
}

interface CreateOrderResponse {
  id: string;
  status: string;
  payment_source: PaymentSource;
  links: Link[];
}

const webhookEventVerifyRequestSchema = z.object({
  body: z
    .object({
      auth_algo: z.string(),
      cert_url: z.string(),
      transmission_id: z.string(),
      transmission_sig: z.string(),
      transmission_time: z.string(),
      webhook_event: z.string(),
      webhook_id: z.string(),
    })
    .required(),
  headers: z.object({
    "Content-Type": z.string().default("application/json"),
  }),
  json: z.boolean(),
  method: z.string(),
  uri: z.string().default("/v1/notifications/verify-webhook-signature"),
});
