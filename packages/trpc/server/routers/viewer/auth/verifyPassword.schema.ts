import { z } from "zod";

export const ZVerifyPasswordInputSchema = z.object({
  passwordInput: z.string(),
});

export type TVerifyPasswordInputSchema = z.infer<typeof ZVerifyPasswordInputSchema>;
