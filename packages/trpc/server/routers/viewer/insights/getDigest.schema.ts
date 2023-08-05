import { z } from "zod";

export const ZGetDigestInputSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  userId: z.number().min(1),
});

export type TGetDigestInputSchema = z.infer<typeof ZGetDigestInputSchema>;
