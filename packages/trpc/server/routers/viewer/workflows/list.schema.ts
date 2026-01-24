import { z } from "zod";

export type TListInputSchema = {
  teamId?: number;
  userId?: number;
  includeOnlyEventTypeWorkflows: boolean;
};

export const ZListInputSchema: z.ZodType<TListInputSchema> = z.object({
  teamId: z.number().optional(),
  userId: z.number().optional(),
  includeOnlyEventTypeWorkflows: z.boolean(),
});
