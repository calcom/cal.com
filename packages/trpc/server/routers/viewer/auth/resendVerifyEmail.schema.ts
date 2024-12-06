import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";

export const ZResendVerifyEmailSchema = z
  .object({
    email: emailSchema,
  })
  .optional();

export type TResendVerifyEmailSchema = z.infer<typeof ZResendVerifyEmailSchema>;
