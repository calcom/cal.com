import { z } from "zod";

export const ZSetInviteExpirationInputSchema = z.object({
  token: z.string(),
  expiresInDays: z.number().optional(),
});

export type TSetInviteExpirationInputSchema = z.infer<typeof ZSetInviteExpirationInputSchema>;
