import { z } from "zod";

export const googleCredentialSchema = z.object({
  scope: z.string(),
  expiry_date: z.number(),
  token_type: z.literal("Bearer"),
  access_token: z.string(),
  refresh_token: z.string(),
});
