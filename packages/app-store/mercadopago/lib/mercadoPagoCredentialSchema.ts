import { z } from "zod";

export const mercadoPagoOAuthTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(),
  scope: z.string(),
  user_id: z.number(),
  refresh_token: z.string().startsWith("TG-"),
  public_key: z.string(),
});
export type MercadoPagoOAuthTokenSchema = z.infer<typeof mercadoPagoOAuthTokenSchema>;

export const mercadoPagoCredentialSchema = mercadoPagoOAuthTokenSchema.extend({
  expires_at: z.number(),
});

export type MercadoPagoCredentialSchema = z.infer<typeof mercadoPagoCredentialSchema>;

export const mercadoPagoUserCredentialSchema = z.object({
  id: z.number().int(),
  key: mercadoPagoCredentialSchema,
});

export type MercadoPagoUserCredentialSchema = z.infer<typeof mercadoPagoUserCredentialSchema>;
