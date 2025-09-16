import { z } from "zod";

export const ZListCallsInputSchema = z.object({
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  filters: z
    .object({
      phoneNumberId: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

export type TListCallsInputSchema = z.infer<typeof ZListCallsInputSchema>;
