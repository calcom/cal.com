import { z } from "zod";

export const ZGetInputSchema = z.object({
  id: z.string(),
  teamId: z.number().optional(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
