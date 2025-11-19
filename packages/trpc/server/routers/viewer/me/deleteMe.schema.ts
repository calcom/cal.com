import { z } from "zod";

export const ZDeleteMeInputSchema = z.object({
  password: z.string(),
  totpCode: z.string().optional(),
});

export type TDeleteMeInputSchema = z.infer<typeof ZDeleteMeInputSchema>;
