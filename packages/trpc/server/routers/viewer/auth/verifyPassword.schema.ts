import { z } from "zod";

export type TVerifyPasswordInputSchema = {
  passwordInput: string;
};

export const ZVerifyPasswordInputSchema: z.ZodType<TVerifyPasswordInputSchema> = z.object({
  passwordInput: z.string(),
});
