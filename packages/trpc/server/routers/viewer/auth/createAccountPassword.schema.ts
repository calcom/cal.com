import { z } from "zod";

export const ZCreateAccountPasswordInputSchema = z.object({
  newPassword: z.string(),
  confirmPassword: z.string(),
});

export type TCreateAccountPasswordInputSchema = z.infer<typeof ZCreateAccountPasswordInputSchema>;
