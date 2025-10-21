import { z } from "zod";

export const ZFormByResponseIdInputSchema = z.object({
  formResponseId: z.number(),
});
