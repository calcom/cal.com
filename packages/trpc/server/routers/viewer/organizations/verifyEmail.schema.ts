import { z } from "zod";

export const ZVerifyEmailInputSchema = z.object({
  email: z.string().email(),
  language: z.string().optional(),
});

export type TVerifyEmailInputSchema = z.infer<typeof ZVerifyEmailInputSchema>;
