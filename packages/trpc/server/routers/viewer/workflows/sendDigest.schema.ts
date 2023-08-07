import { z } from "zod";

export const ZSendDigestInputSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  userId: z.number().min(1),
});

export type TSendDigestInputSchema = z.infer<typeof ZSendDigestInputSchema>;
