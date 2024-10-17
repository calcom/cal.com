import z from "zod";

export const adyenCredentialKeysSchema = z.object({
  access_token: z.string(),
  expires_at: z.number(),
  refresh_token: z.string(),
  merchant_account_id: z.string(),
  client_key: z.string(),
  live_url_prefix: z.string(),
  webhook_id: z.string(),
  hmac_key: z.string(),
});

export type AdyenCredentialKeys = z.infer<typeof adyenCredentialKeysSchema>;

export const paymentSessionsPayloadSchema = z.object({
  merchantAccount: z.string(),
  amount: z.object({
    currency: z.string(),
    value: z.number(),
  }),
  reference: z.string(),
  returnUrl: z.string(),
  countryCode: z.string().optional(),
  shopperLocale: z.string().optional(),
  blockedPaymentMethods: z.array(z.string()).optional(),
  channel: z.string().optional(),
  shopperReference: z.string().optional(),
  shopperEmail: z.string().optional(),
});

export type PaymentSessionsPayload = z.infer<typeof paymentSessionsPayloadSchema>;

export type CreatePaymentSessionsInput = PaymentSessionsPayload & { organizerUserId: number };

export const createPaymentSessionsInputSchema = paymentSessionsPayloadSchema
  .extend({
    organizerUserId: z.number(),
  })
  .omit({ merchantAccount: true });
