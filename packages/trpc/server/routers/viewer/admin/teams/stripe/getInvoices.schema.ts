import { z } from "zod";

export const ZGetInvoicesSchema = z.object({
  teamId: z.number(),
  limit: z.number().min(1).max(100).default(10),
  startingAfter: z.string().optional(),
});

export type TGetInvoicesSchema = z.infer<typeof ZGetInvoicesSchema>;
