import { z } from "zod";

import { emailRegex } from "@calcom/prisma/zod-utils";

export const ZResendVerifyEmailSchema = z
  .object({
    email: z.string().regex(emailRegex),
  })
  .optional();

export type TResendVerifyEmailSchema = z.infer<typeof ZResendVerifyEmailSchema>;
