import { z } from "zod";

export const kyzonCredentialKeySchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  expiry_date: z.number(),
  user_id: z.string(),
  team_id: z.string(),
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
