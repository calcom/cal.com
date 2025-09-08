import { z } from "zod";

export const ZCreateInputSchema = z.object({
  teamId: z.number().optional(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
