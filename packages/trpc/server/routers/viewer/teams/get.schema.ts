import { z } from "zod";

export const ZGetInputSchema = z.object({
  teamId: z.number(),
  isOrg: z.boolean().default(false),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
