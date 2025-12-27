import { z } from "zod";

export type TSendVerificationCodeInputSchema = {
  phoneNumber: string;
};

export const ZSendVerificationCodeInputSchema = z.object({
  phoneNumber: z.string(),
});
