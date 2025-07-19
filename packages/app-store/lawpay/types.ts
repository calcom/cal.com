import { z } from "zod";

// LawPay credential schema
export const lawPayCredentialSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  public_key: z.string(),
  secret_key: z.string(),
  merchant_id: z.string(),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

export type LawPayCredential = z.infer<typeof lawPayCredentialSchema>;

// LawPay token schema
export const lawPayTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type LawPayToken = z.infer<typeof lawPayTokenSchema>;

// LawPay charge schema
export const lawPayChargeSchema = z.object({
  amount: z.number(),
  currency: z.string().default("USD"),
  description: z.string(),
  method: z.object({
    type: z.literal("card"),
    number: z.string(),
    exp_month: z.number(),
    exp_year: z.number(),
    cvv: z.string(),
    name: z.string(),
    address1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }),
  account_id: z.string(),
  auto_capture: z.boolean().default(true),
  reference: z.string().optional(),
});

export type LawPayCharge = z.infer<typeof lawPayChargeSchema>;

// LawPay token request schema
export const lawPayTokenRequestSchema = z.object({
  type: z.literal("card"),
  number: z.string(),
  exp_month: z.number(),
  exp_year: z.number(),
  cvv: z.string(),
  name: z.string(),
  address1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});

export type LawPayTokenRequest = z.infer<typeof lawPayTokenRequestSchema>;

// LawPay merchant schema
export const lawPayMerchantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }),
  status: z.enum(["active", "inactive", "pending"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export type LawPayMerchant = z.infer<typeof lawPayMerchantSchema>;

// LawPay transaction schema
export const lawPayTransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  description: z.string(),
  status: z.enum(["pending", "succeeded", "failed", "cancelled", "refunded"]),
  method: z.object({
    type: z.string(),
    last4: z.string().optional(),
    brand: z.string().optional(),
    name: z.string().optional(),
  }),
  account_id: z.string(),
  reference: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.string()).optional(),
});

export type LawPayTransaction = z.infer<typeof lawPayTransactionSchema>;

// LawPay payment intent schema
export const lawPayPaymentIntentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  description: z.string(),
  status: z.enum([
    "requires_payment_method",
    "requires_confirmation",
    "requires_action",
    "processing",
    "succeeded",
    "cancelled",
  ]),
  client_secret: z.string(),
  account_id: z.string(),
  reference: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.string()).optional(),
});

export type LawPayPaymentIntent = z.infer<typeof lawPayPaymentIntentSchema>;

// LawPay webhook event schema
export const lawPayWebhookEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    "charge.succeeded",
    "charge.failed",
    "charge.refunded",
    "charge.disputed",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "payment_intent.cancelled",
  ]),
  data: z.object({
    object: z.union([lawPayTransactionSchema, lawPayPaymentIntentSchema]),
  }),
  created_at: z.string(),
  livemode: z.boolean(),
});

export type LawPayWebhookEvent = z.infer<typeof lawPayWebhookEventSchema>;

// LawPay error schema
export const lawPayErrorSchema = z.object({
  type: z.string(),
  code: z.string(),
  message: z.string(),
  param: z.string().optional(),
  decline_code: z.string().optional(),
});

export type LawPayError = z.infer<typeof lawPayErrorSchema>;

// LawPay API response schema
export const lawPayApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: lawPayErrorSchema.optional(),
  message: z.string().optional(),
});

export type LawPayApiResponse = z.infer<typeof lawPayApiResponseSchema>;
