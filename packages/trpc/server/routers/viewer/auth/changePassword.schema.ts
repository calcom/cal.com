import { z } from "zod";

export type TChangePasswordInputSchema = {
  oldPassword: string;
  newPassword: string;
};

export const ZChangePasswordInputSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});
