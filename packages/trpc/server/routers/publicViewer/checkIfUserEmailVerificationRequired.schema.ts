import { z } from "zod";

export const ZUserEmailVerificationRequiredSchema = z.object({
  userSessionEmail: z.string().optional(),
  email: z.string(),
});

export type TUserEmailVerificationRequiredSchema = z.infer<typeof ZUserEmailVerificationRequiredSchema>;
