import { z } from "zod";

export const ZGetMinimalSchema = z.object({
  teamId: z.number(),
  isOrg: z.boolean().optional(),
});

export type TGetMinimalInputSchema = z.infer<typeof ZGetMinimalSchema>;
