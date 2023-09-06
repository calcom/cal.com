import { z } from "zod";

export const mercadoPagoCredentialSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(),
  scope: z.string(),
  user_id: z.number(),
  refresh_token: z.string().startsWith("TG-"),
  public_key: z.string(),
});

export type MercadoPagoCredentialSchema = z.infer<typeof mercadoPagoCredentialSchema>;
