import { z } from "zod";

export type TSetInviteExpirationInputSchema = {
  token: string;
  expiresInDays?: number;
};

export const ZSetInviteExpirationInputSchema: z.ZodType<TSetInviteExpirationInputSchema> = z.object({
  token: z.string(),
  expiresInDays: z.number().optional(),
});
