import { z } from "zod";

export type TChangePasswordInputSchema = {
  oldPassword: string;
  newPassword: string;
};

export const ZChangePasswordInputSchema: z.ZodType<TChangePasswordInputSchema> = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});
