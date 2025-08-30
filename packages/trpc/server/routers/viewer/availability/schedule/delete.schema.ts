import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  scheduleId: z.number(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
