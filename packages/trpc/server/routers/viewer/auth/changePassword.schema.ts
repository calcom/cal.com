import { z } from "zod";

export const ZChangePasswordInputSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});

export type TChangePasswordInputSchema = z.infer<typeof ZChangePasswordInputSchema>;
