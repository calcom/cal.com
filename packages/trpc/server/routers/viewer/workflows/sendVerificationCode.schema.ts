import { z } from "zod";

export type TSendVerificationCodeInputSchema = {
  phoneNumber: string;
};

export const ZSendVerificationCodeInputSchema: z.ZodType<TSendVerificationCodeInputSchema> = z.object({
  phoneNumber: z.string(),
});
