import { z } from "zod";

export const ZGetInputSchema = z.object({
  teamId: z.union([z.number(), z.null()]),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
