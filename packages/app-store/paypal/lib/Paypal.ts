import { IS_PRODUCTION } from "@calcom/lib/constants";

class Paypal {
  url: string;
  clientId: string;
  secretKey: string;
  accessToken: string | null = null;

  constructor({ clientId, secretKey }: { clientId: string; secretKey: string }) {
    this.url = IS_PRODUCTION ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    this.clientId = clientId;
    this.secretKey = secretKey;
  }

  async getAccessToken(): Promise<void> {
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
        const { access_token } = await response.json();
        this.accessToken = access_token;
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
  }: {
    referenceId: string;
    amount: number;
    currency: string;
    returnUrl: string;
  }): Promise<PaymentResponse> {
    // Always get a new access token
    await this.getAccessToken();

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };

    const paymentRequestBody: PaymentRequestBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          amount: {
            currency_code: currency,
            value: (amount / 100).toString(),
          },
        },
      ],
      application_context: {
        user_action: "PAY_NOW",
        return_url: returnUrl,
      },
    };

    try {
      const response = await fetch(`${this.url}/v2/checkout/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(paymentRequestBody),
      });

      if (response.ok) {
        const paymentResponse: PaymentResponse = await response.json();
        return paymentResponse;
      } else {
        console.error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error(error);
    }
    return {} as PaymentResponse;
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
      url: `https://5bf4-200-76-22-226.ngrok.io/api/integrations//paypal/webhook`,
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
  payment_method_preference: string;
  payment_method_selected: string;
  brand_name: string;
  locale: string;
  landing_page: string;
  shipping_preference: string;
  user_action: string;
  return_url: string;
  cancel_url: string;
}

interface PaymentSource {
  paypal: {
    experience_context?: ExperienceContext;
  };
}

interface PaymentRequestBody {
  purchase_units: PurchaseUnit[];
  intent: string;
  // payment_source can be omitted for orders when you don't have paypal-request-id
  payment_source?: PaymentSource;
  application_context: {
    user_action: string;
    return_url: string;
  };
}

interface Link {
  href: string;
  rel: string;
  method: string;
}

interface PaymentResponse {
  id: string;
  status: string;
  payment_source: PaymentSource;
  links: Link[];
}
