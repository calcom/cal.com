import { z } from "zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
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
