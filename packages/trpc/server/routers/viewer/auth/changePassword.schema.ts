import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TChangePasswordInputSchema = {
  oldPassword: string;
  newPassword: string;
};

export const ZChangePasswordInputSchema: z.ZodType<TChangePasswordInputSchema> = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});
