import { z } from "zod";

export type TWorkflowOrderInputSchema = {
  ids: number[];
};

export const ZWorkflowOrderInputSchema = z.object({
  ids: z.array(z.number()),
});
