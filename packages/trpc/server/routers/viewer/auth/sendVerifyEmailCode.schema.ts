import { z } from "zod";

export type TSendVerifyEmailCodeSchema = {
  email: string;
  username?: string;
  language: string;
  isVerifyingEmail?: boolean;
};

export const ZSendVerifyEmailCodeSchema: z.ZodType<TSendVerifyEmailCodeSchema> = z.object({
  email: z.string().min(1),
  username: z.string().optional(),
  language: z.string(),
  isVerifyingEmail: z.boolean().optional(),
});
