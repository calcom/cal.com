import { z } from "zod";

export const ZCalIdWorkflowOrderInputSchema = z.object({
  ids: z.array(z.number()),
});

export type TCalIdWorkflowOrderInputSchema = z.infer<typeof ZCalIdWorkflowOrderInputSchema>;
