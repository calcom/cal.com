import type { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { IS_PRODUCTION, WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

type PaypalLink = { href: string; rel: "self" | "action_url"; method: "GET"; description: string };

class Paypal {
  url: string;
  clientId: string;
  secretKey: string;
  accessToken: string | null = null;
  expiresAt: number | null = null;

  constructor() {
    this.url = IS_PRODUCTION ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    this.clientId = PAYPAL_CLIENT_ID;
    this.secretKey = PAYPAL_CLIENT_SECRET;
  }

  private fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
    await this.getAccessToken();
    return fetch(`${this.url}${endpoint}`, {
      method: "get",
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        ...init?.headers,
      },
    });
  };

  async getOnboardingLink(userId: number): Promise<string> {
    // Refresh acces token if needed
    await this.getAccessToken();
    const redirect_uri = encodeURI(`${WEBAPP_URL}/api/integrations/paypal/callback`);
    const paypalPartnerRes = await fetch(`${this.url}/v2/customer/partner-referrals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        trackingId: userId,
        operations: [
          {
            operation: "API_INTEGRATION",
            api_integration_preference: {
              rest_api_integration: {
                integration_method: "PAYPAL",
                integration_type: "THIRD_PARTY",
                third_party_details: {
                  features: ["PAYMENT", "REFUND"],
                },
              },
            },
          },
        ],
        products: ["EXPRESS_CHECKOUT"],
        legal_consents: [
          {
            type: "SHARE_DATA_CONSENT",
            granted: true,
          },
        ],
        partner_config_override: { redirect_url: redirect_uri },
      }),
    });
    const partnerLinksObj: { links: PaypalLink[] } = await paypalPartnerRes.json();
    const onboardingLink = partnerLinksObj.links.find((link) => link.rel === "action_url") ?? "";
    if (!onboardingLink) {
      throw new Error("Failed to get onboarding redirect url");
    }
    return onboardingLink.rel;
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
      } else if (response?.status) {
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
    cancelUrl,
    intent = "CAPTURE",
  }: {
    referenceId: string;
    amount: number;
    currency: string;
    returnUrl: string;
    cancelUrl: string;
    intent?: "CAPTURE" | "AUTHORIZE";
  }): Promise<CreateOrderResponse> {
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
            cancel_url: cancelUrl,
          },
        },
      },
    };

    try {
      const response = await this.fetcher("/v2/checkout/orders", {
        method: "POST",
        headers: {
          "PayPal-Request-Id": uuidv4(),
        },
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

  async captureOrder(orderId: string): Promise<boolean> {
    try {
      const captureResult = await this.fetcher(`/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
      });
      if (captureResult.ok) {
        const result = await captureResult.json();
        if (result?.status === "COMPLETED") {
          // Get payment reference id

          const payment = await prisma.payment.findFirst({
            where: {
              externalId: orderId,
            },
            select: {
              id: true,
              bookingId: true,
              data: true,
            },
          });

          if (!payment) {
            throw new Error("Payment not found");
          }

          await prisma.payment.update({
            where: {
              id: payment?.id,
            },
            data: {
              success: true,
              data: Object.assign(
                {},
                { ...(payment?.data as Record<string, string | number>), capture: result.id }
              ) as unknown as Prisma.InputJsonValue,
            },
          });

          // Update booking as paid
          await prisma.booking.update({
            where: {
              id: payment.bookingId,
            },
            data: {
              status: "ACCEPTED",
            },
          });

          return true;
        }
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
    return false;
  }

  async createWebhook(): Promise<boolean | string> {
    const body = {
      url: `${WEBAPP_URL}/api/integrations/paypal/webhook`,
      event_types: [
        {
          name: "CHECKOUT.ORDER.APPROVED",
        },
        {
          name: "CHECKOUT.ORDER.COMPLETED",
        },
      ],
    };

    try {
      const response = await this.fetcher(`/v1/notifications/webhooks`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        return result.id as string;
      }
    } catch (error) {
      console.error(error);
    }

    return false;
  }

  async listWebhooks(): Promise<string[]> {
    try {
      const response = await this.fetcher(`/v1/notifications/webhooks`);

      if (response.ok) {
        const { webhooks } = await response.json();

        return webhooks
          .filter((webhook: { id: string; url: string }) => {
            return webhook.url.includes("api/integrations/paypal/webhook");
          })
          .map((webhook: { id: string }) => webhook.id);
      }
    } catch (error) {
      console.error(error);
      return [];
    }
    return [];
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      const response = await this.fetcher(`/v1/notifications/webhooks/${webhookId}`, {
        method: "DELETE",
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

  async verifyWebhook(options: WebhookEventVerifyRequest): Promise<void> {
    const parseRequest = webhookEventVerifyRequestSchema.safeParse(options);

    // Webhook event should be parsable
    if (!parseRequest.success) {
      console.error(parseRequest.error);
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

    const bodyToString = `${stringy.slice(0, -1)},"webhook_event":${options.body.webhook_event}}`;

    try {
      const response = await this.fetcher(`/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        body: bodyToString,
      });

      if (!response.ok) {
        throw response;
      }
      const data = await response.json();

      if (data.verification_status !== "SUCCESS") {
        throw data;
      }
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
});

export type WebhookEventVerifyRequest = z.infer<typeof webhookEventVerifyRequestSchema>;
