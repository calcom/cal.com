import { z } from "zod";

export const ZGetInputSchema = z.object({
  teamId: z.number(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
