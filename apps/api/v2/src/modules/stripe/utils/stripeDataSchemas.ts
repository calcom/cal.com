import { z } from "zod";

export const stripeOAuthTokenSchema = z.object({
  access_token: z.string().optional(),
  scope: z.string().optional(),
  livemode: z.boolean().optional(),
  token_type: z.literal("bearer").optional(),
  refresh_token: z.string().optional(),
  stripe_user_id: z.string().optional(),
  stripe_publishable_key: z.string().optional(),
});

export const stripeDataSchema = stripeOAuthTokenSchema.extend({
  default_currency: z.string(),
});

export type StripeData = z.infer<typeof stripeDataSchema>;

export const stripeKeysResponseSchema = z.object({
  client_id: z.string().startsWith("ca_").min(1),
  client_secret: z.string().startsWith("sk_").min(1),
  public_key: z.string().startsWith("pk_").min(1),
  webhook_secret: z.string().startsWith("whsec_").min(1),
});
