import { z } from "zod";

export const ZLocationOptionsInputSchema = z.object({
  teamId: z.number().optional(),
});

export type TLocationOptionsInputSchema = z.infer<typeof ZLocationOptionsInputSchema>;
