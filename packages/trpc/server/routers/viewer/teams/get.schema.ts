import { z } from "zod";

export const ZGetSchema = z.object({
  teamId: z.number(),
  isOrg: z.boolean().optional(),
});

export type TGetInputSchema = z.infer<typeof ZGetSchema>;
