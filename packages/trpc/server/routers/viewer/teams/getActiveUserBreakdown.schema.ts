import { z } from "zod";

export const ZGetActiveUserBreakdownInputSchema = z.object({
  teamId: z.number(),
});

export type TGetActiveUserBreakdownInputSchema = z.infer<typeof ZGetActiveUserBreakdownInputSchema>;
