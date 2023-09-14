import { z } from "zod";

export const ZSendVerifyEmailCodeSchema = z.object({
  email: z.string().min(1),
  username: z.string().optional(),
  language: z.string().optional(),
});

export type TSendVerifyEmailCodeSchema = z.infer<typeof ZSendVerifyEmailCodeSchema>;
