import { z } from "zod";

export type TVerifyEmailCodeInputSchema = {
  teamId?: number;
  code: string;
  email: string;
};

export const ZVerifyEmailCodeInputSchema: z.ZodType<TVerifyEmailCodeInputSchema> = z.object({
  teamId: z.number().optional(),
  code: z.string(),
  email: z.string(),
});
