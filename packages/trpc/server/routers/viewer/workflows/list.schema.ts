import { z } from "zod";

export const ZListInputSchema = z.object({
  teamId: z.number().optional(),
  userId: z.number().optional(),
  includeOnlyEventTypeWorkflows: z.boolean(),
});

export type TListInputSchema = z.infer<typeof ZListInputSchema>;
