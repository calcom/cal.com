import { IS_PRODUCTION } from "@calcom/lib/constants";

class Paypal {
  url: string;
  bearerToken: string;
  constructor({ clientId, secretKey }: { clientId?: string; secretKey: string }) {
    this.url = IS_PRODUCTION ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    this.bearerToken = secretKey;
  }

  // Orders
  async createOrder({
    referenceId,
    amount,
    currency,
  }: {
    referenceId: string;
    amount: number;
    currency: string;
  }): Promise<PaymentResponse> {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer ",
    };

    const paymentRequestBody: PaymentRequestBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          amount: {
            currency_code: currency,
            value: amount.toString(),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            payment_method_selected: "PAYPAL",
            brand_name: "EXAMPLE INC",
            locale: "en-US",
            landing_page: "LOGIN",
            shipping_preference: "SET_PROVIDED_ADDRESS",
            user_action: "PAY_NOW",
            return_url: "https://example.com/returnUrl",
            cancel_url: "https://example.com/cancelUrl",
          },
        },
      },
    };

    try {
      const response = await fetch(`${this.url}}/v2/checkout/orders`, {
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
  payment_source: PaymentSource;
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
