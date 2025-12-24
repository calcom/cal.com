import { z } from "zod";

export type TWorkflowOrderInputSchema = {
  ids: number[];
};

export const ZWorkflowOrderInputSchema: z.ZodType<TWorkflowOrderInputSchema> = z.object({
  ids: z.array(z.number()),
});
