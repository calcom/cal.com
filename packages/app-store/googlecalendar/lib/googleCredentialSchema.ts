import { z } from "zod";

export const googleCredentialSchema = z.object({
  scope: z.string(),
  token_type: z.literal("Bearer"),
  expiry_date: z.number(),
  access_token: z.string(),
  refresh_token: z.string(),
  notificationTimes: z.array(z.number()).optional(),
});
