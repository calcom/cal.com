import { z } from "zod";

export const ZVerifyCodeInputSchema = z.object({
  email: z.string().email(),
  code: z.string(),
});

export type ZVerifyCodeInputSchema = z.infer<typeof ZVerifyCodeInputSchema>;
