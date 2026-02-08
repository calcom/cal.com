import { z } from "zod";

export const ZDeleteMeInputSchema = z.object({
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

export type TDeleteMeInputSchema = z.infer<typeof ZDeleteMeInputSchema>;
