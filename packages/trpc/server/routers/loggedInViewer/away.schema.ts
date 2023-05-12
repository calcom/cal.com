import { z } from "zod";

export const ZAwayInputSchema = z.object({
  away: z.boolean(),
});

export type TAwayInputSchema = z.infer<typeof ZAwayInputSchema>;
