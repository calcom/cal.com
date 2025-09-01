import { z } from "zod";

export const kyzonCredentialKeySchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  token_type: z.literal("Bearer").optional(),
  scope: z.string().optional(),
  /* store ms since epoch, > now */
  expiry_date: z.number().int().positive(),
  user_id: z.coerce.string().min(1),
  team_id: z.coerce.string().min(1),
});

export type KyzonCredentialKey = z.infer<typeof kyzonCredentialKeySchema>;

export function getKyzonCredentialKey(payload: {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  user_id: string;
  team_id: string;
}): KyzonCredentialKey {
  const { expires_in, ...rest } = payload;

  return {
    ...rest,
    expiry_date: Math.round(Date.now() + expires_in * 1000),
  };
}
