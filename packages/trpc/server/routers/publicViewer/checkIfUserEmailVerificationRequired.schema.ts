import { z } from "zod";

export type TUserEmailVerificationRequiredSchema = {
  userSessionEmail?: string;
  email: string;
};

export const ZUserEmailVerificationRequiredSchema = z.object({
  userSessionEmail: z.string().optional(),
  email: z.string(),
});
