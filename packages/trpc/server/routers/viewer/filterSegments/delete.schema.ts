import { z } from "zod";

export const ZDeleteFilterSegmentInputSchema = z.object({
  id: z.number().int().positive(),
});

export type TDeleteFilterSegmentInputSchema = z.infer<typeof ZDeleteFilterSegmentInputSchema>;
