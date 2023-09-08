import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import {
  mercadoPagoOAuthTokenSchema,
  type MercadoPagoCredentialSchema,
  type MercadoPagoUserCredentialSchema,
} from "./mercadoPagoCredentialSchema";

class MercadoPago {
  readonly authUrl = "https://auth.mercadopago.com";
  readonly url = "https://api.mercadopago.com";
  clientId: string;
  clientSecret: string;
  userCredentials?: MercadoPagoUserCredentialSchema;

  constructor(opts: {
    clientId: string;
    clientSecret: string;
    userCredentials?: MercadoPagoUserCredentialSchema;
  }) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.userCredentials = opts.userCredentials;
  }

  /**
   * @returns Redirect uri to MercadoPago's callback in Cal.com
   */
  private getRedirectUri() {
    const redirectUri = encodeURI(WEBAPP_URL + "/api/integrations/mercadopago/callback");
    return redirectUri;
  }

  /**
   * Retrieves the MercadoPago OAuth Url
   *
   * For more information about the OAuth
   * @url https://mercadopago.com.pe/developers/es/reference/oauth/_oauth_token/post
   *
   * @param state State to receive on the callback url as query param after the successful OAuth
   */
  getOAuthUrl(state: string): string {
    const params = new URLSearchParams();
    params.set("client_id", this.clientId);
    params.set("response_type", "code");
    params.set("platform_id", "mp");
    params.set("redirect_uri", this.getRedirectUri());
    params.set("state", state);

    const url = `${this.authUrl}/authorization?${params}`;

    return url;
  }

  /**
   * Creates or refreshes OAuth token
   *
   * For more information:
   * @url https://www.mercadopago.com.pe/developers/es/reference/oauth/_oauth_token/post
   *
   * @param obj
   * @param obj.code Code granted by the authentication server so that the application can obtain an access token and an associated refresh token. It has a validity of 10 minutes counted from its generation.
   * @param obj.refreshToken Token received when the access token is created.
   */
  async getOAuthToken({ code, refreshToken }: GetOAuthTokenArg): Promise<MercadoPagoCredentialSchema> {
    const response = await fetch(`${this.url}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_secret: this.clientSecret,
        test_token: process.env.NODE_ENV !== "production",
        ...(code
          ? {
              grant_type: "authorization_code",
              code,
              redirect_uri: this.getRedirectUri(),
            }
          : {}),
        ...(refreshToken
          ? {
              grant_type: "refresh_token",
              refresh_token: refreshToken,
            }
          : {}),
      }),
    });

    const data = await response.json();

    if (data.error) {
      const { cause, error, error_description, status } = data;
      console.error("There was an error with retrieving MercadoPago OAuth token:", {
        cause,
        error,
        error_description,
        status,
      });
      throw new Error(error);
    }

    const credentials = mercadoPagoOAuthTokenSchema
      .transform((val) => ({ ...val, expires_at: Date.now() + val.expires_in * 1000 }))
      .parse(data);

    return credentials;
  }

  private fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
    if (!this.userCredentials) throw new Error("Missing user credentials");

    let accessToken = this.userCredentials.key.access_token;

    if (Date.now() >= this.userCredentials.key.expires_at) {
      const refreshedOAuth = await this.getOAuthToken({
        refreshToken: this.userCredentials.key.refresh_token,
      });

      await prisma.credential.update({
        where: { id: this.userCredentials.id },
        data: {
          key: refreshedOAuth,
        },
      });

      accessToken = refreshedOAuth.access_token;
    }

    return fetch(`${this.url}${endpoint}`, {
      method: "get",
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...init?.headers,
      },
    });
  };

  async createPreference({
    amount,
    currency,
    paymentUid,
    bookingId,
    eventTypeId,
    bookerEmail,
    eventName,
    notificationUrl,
    returnUrl,
    cancelUrl,
  }: CreatePreferenceArg) {
    const body: PreferenceCreateBody = {
      items: [
        {
          id: String(eventTypeId),
          title: eventName,
          quantity: 1,
          unit_price: amount,
          category_id: "services",
          currency_id: currency,
        },
      ],
      external_reference: paymentUid,
      marketplace: this.clientId,
      marketplace_fee: 0,
      metadata: {
        identifier: "cal.com",
        bookingId,
        bookerEmail,
        eventName,
      },
      payer: {
        email: bookerEmail,
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [{ id: "atm" }, { id: "ticket" }],
      },
      auto_return: "approved",
      notification_url: notificationUrl,
      back_urls: {
        success: returnUrl,
        pending: cancelUrl,
        failure: cancelUrl,
      },
    };

    const response = await this.fetcher("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data: CreatedPreference = await response.json();
      return data;
    } else {
      const error: MPError = await response.json();
      console.error(`Request failed with status ${response.status}:`, error);
      throw new Error(error.message);
    }
  }

  async getApprovedPayment(externalReference: string) {
    const params = new URLSearchParams();
    params.set("sort", "date_approved");
    params.set("criteria", "desc");
    params.set("external_reference", externalReference);
    params.set("range", "date_approved");
    params.set("begin_date", "NOW-7DAYS");
    params.set("end_date", "NOW");

    const response = await this.fetcher(`/v1/payments/search${params}`);
    if (response.ok) {
      const data: SearchedPayment = await response.json();

      if (data.length > 0 && data[0].results.length > 0) {
        return data[0].results[0];
      }

      return null;
    } else {
      const error: MPError = await response.json();
      console.error(`Request failed with status ${response.status}:`, error);
      throw new Error(error.message);
    }
  }

  async getPayment(paymentId: string) {
    const endpoint = `/v1/payments/${paymentId}`;

    const response = this.userCredentials
      ? await this.fetcher(endpoint)
      : await fetch(`${this.url}${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.clientSecret}`,
          },
        });

    if (response.ok) {
      const data: MercadoPagoPayment = await response.json();

      return data;
    } else {
      const error: MPError = await response.json();
      console.error(`Request failed with status ${response.status}:`, error);
      throw new Error(error.message);
    }
  }

  async refundPayment(paymentId: string) {
    const response = await this.fetcher(`/v1/payments/${paymentId}/refunds`, {
      method: "POST",
    });

    if (response.ok) {
      const data: MercadoPagoRefund = await response.json();

      return data;
    } else {
      const error: MPError = await response.json();
      console.error(`Request failed with status ${response.status}:`, error);
      throw new Error(error.message);
    }
  }
}

type GetOAuthTokenArg =
  | { code: string; refreshToken?: undefined }
  | { refreshToken: string; code?: undefined };

type PreferenceItem = {
  /** Identifier of the item (Required) */
  id: string;

  /** This is the title of the item, which will be displayed during the payment process, in the checkout, activities, and emails (Required) */
  title: string;

  /** Description of the item (Optional) */
  description?: string;

  /** URL of the item image (Optional) */
  picture_url?: string;

  /** This is a free string where the item category can be added. (Optional) */
  category_id?: string;

  /** Quantity of items. This property is used to calculate the total cost (Required) */
  quantity: number;

  /** Unique ID to identify the currency. ISO_4217 code. Some sites allow local currency and USD, but it is important to note that the amount is converted to local currency when the preference is created, since the checkout always processes transactions in local currency. If you use USD, keep in mind that this value is not automatically updated if the value of the local currency changes in relation to USD. (Optional) */
  currency_id?: "USD" | "ARS" | "BRL" | "CLP" | "MXN" | "COP" | "PEN" | "UYU" | string;

  /** Unit price of the item. This property is used along with the 'quantity' property to determine the cost of the order (Required) */
  unit_price: number;
};

interface PreferenceCreateBody {
  /** Information about the items */
  items: PreferenceItem[];

  /** External reference to sync with Cal.com ayments (`uid` property in `Payment` model). */
  external_reference?: string;

  marketplace?: string;
  marketplace_fee?: 0; // TODO: Add config to allow Cal.com to take a fee.

  /** Payer information */
  payer?: {
    /** Payer email address */
    email: string;
  };

  /** Payment methods settings for the preference */
  payment_methods?: {
    excluded_payment_methods?: { id: string }[];
    excluded_payment_types?: { id: string }[];
  };

  /**
   * Handles the post-purchase redirection for the user.
   *
   * Redirection behaviors:
   * - `approved`: The user is redirected only if the payment is approved.
   * - `all`: The user is redirected for approved payments, but this
   *    behavior is subject to change to include other statuses (forward compatibility).
   */
  auto_return: "all" | "approved";

  /** Webhook Notification URL (should be the same as the MercadoPago app integration) */
  notification_url?: string;

  /** URL to return the customer */
  back_urls?: {
    /** Return URL after success payment */
    success?: string;

    /** Return URL after pending payment */
    pending?: string;

    /** Return URL after cancelled checkout */
    failure?: string;
  };

  /**
   *  Set of key-value pairs that you can attach to the preference. This can be useful for storing additional information about the object in a structured format.
   */
  metadata: Record<string, string | number>;
}

type CreatePreferenceArg = {
  /** Price expressed as currency units (e.g. 10 = $10, not $0.1) */
  amount: number;

  currency: PreferenceItem["currency_id"];

  /** Payment UID */
  paymentUid: string;

  /** EventType ID */
  eventTypeId: number;

  /** Booking ID */
  bookingId: number;

  /** Booker email address */
  bookerEmail: string;

  /** Event title */
  eventName: string;

  /** Webhook Notification URL for the payment */
  notificationUrl: string;

  /** Return URL after success payment */
  returnUrl: string;

  /** Return URL after cancelled action */
  cancelUrl: string;
};

type CreatedPreference = {
  collector_id: number;
  items: PreferenceItem[];
  client_id: number;
  marketplace: string;
  marketplace_fee: number;
  date_created: string;
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

type MPError = {
  message: string;
  error: string;
  status: number;
  cause: {
    code: number;
    description: string;
    data: string;
  }[];
};

/**
 * Represents the type of payment method.
 */
type PaymentTypeId =
  | "account_money"
  | "ticket"
  | "bank_transfer"
  | "atm"
  | "credit_card"
  | "debit_card"
  | "prepaid_card"
  | "digital_currency"
  | "digital_wallet"
  | "voucher_card"
  | "crypto_transfer";

/**
 * Represents the current status of the payment.
 */
type PaymentStatus =
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back";

/**
 * Represents the detailed status of the payment.
 */
type PaymentStatusDetail =
  | "Accredited"
  | "pending_contingency"
  | "pending_review_manual"
  | "cc_rejected_bad_filled_date"
  | "cc_rejected_bad_filled_other"
  | "cc_rejected_bad_filled_security_code"
  | "cc_rejected_blacklist"
  | "cc_rejected_call_for_authorize"
  | "cc_rejected_card_disabled"
  | "cc_rejected_duplicated_payment"
  | "cc_rejected_high_risk"
  | "cc_rejected_insufficient_amount"
  | "cc_rejected_invalid_installments"
  | "cc_rejected_max_attempts"
  | "cc_rejected_other_reason";

type MercadoPagoPayment = {
  id: number;
  date_created: string;
  date_approved: string;
  date_last_updated: string;
  money_release_date: string;
  payment_method_id: string;
  payment_type_id: PaymentTypeId;
  status: PaymentStatus;
  status_detail: PaymentStatusDetail;
  currency_id: string;
  description: string;
  collector_id: number;
  payer: {
    id: number;
    email: string;
    identification: {
      type: string;
      number: number;
    };
  };
  /** External reference to sync with Cal.com ayments (`uid` property in `Payment` model). */
  external_reference?: string;
  metadata: Record<string, string | number>;
};

type SearchedPayment = [
  {
    paging: {
      total: number;
      limit: number;
      offset: number;
    };
    results: MercadoPagoPayment[];
  }
];

/**
 * Represents the current status of the payment refund.
 */
type RefundStatus = "approved" | "in_process" | "rejected" | "cancelled" | "authorized";

type MercadoPagoRefund = {
  id: number;
  payment_id: number;
  amount: number;
  metadata: Record<string, string | number>[];
  source: [
    {
      name: string;
      id: string;
      type: string;
    }
  ];
  date_created: string;
  unique_sequence_number: number | null;
  refund_mode: string;
  adjustment_amount: number;
  status: RefundStatus;
  reason: string | null;
};

export default MercadoPago;
