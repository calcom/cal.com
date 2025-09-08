import { z } from "zod";

export const ZWorkflowOrderInputSchema = z.object({
  ids: z.array(z.number()),
});

export type TWorkflowOrderInputSchema = z.infer<typeof ZWorkflowOrderInputSchema>;
