import { z } from "zod";

export const ZGetPaymentsSchema = z.object({
  teamId: z.number(),
  limit: z.number().min(1).max(100).default(10),
  startingAfter: z.string().optional(),
});

export type TGetPaymentsSchema = z.infer<typeof ZGetPaymentsSchema>;
