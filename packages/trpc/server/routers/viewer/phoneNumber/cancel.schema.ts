import { z } from "zod";

export const ZCancelInputSchema = z.object({
  phoneNumberId: z.number(),
  teamId: z.number().optional(),
});

export type TCancelInputSchema = z.infer<typeof ZCancelInputSchema>;
