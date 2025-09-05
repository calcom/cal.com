import { emailSchema } from "@calcom/lib/emailSchema";
import { z } from "zod";

export const ZResendVerifyEmailSchema = z
  .object({
    email: emailSchema,
  })
  .optional();

export type TResendVerifyEmailSchema = z.infer<typeof ZResendVerifyEmailSchema>;
