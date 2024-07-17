import { z } from "zod";

export const ZResendVerifyEmailSchema = z
  .object({
    email: z.string().email(),
  })
  .optional();

export type TResendVerifyEmailSchema = z.infer<typeof ZResendVerifyEmailSchema>;
