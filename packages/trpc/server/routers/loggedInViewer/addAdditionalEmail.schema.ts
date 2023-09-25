import { z } from "zod";

export const ZAddAdditionalEmailInputSchema = z.object({
  additionalEmail: z.string().email(),
});

export const ZAdditionalEmailSchema = z.object({
  email: z.string().email(),
  emailVerified: z.boolean(),
  id: z.number(),
  parentUserId: z.number(),
});

export type TAddAdditionalEmailInputSchema = z.infer<typeof ZAddAdditionalEmailInputSchema>;
export type TAdditionalEmailSchema = z.infer<typeof ZAdditionalEmailSchema>;
