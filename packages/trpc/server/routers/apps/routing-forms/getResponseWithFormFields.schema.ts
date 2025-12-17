import { z } from "zod";

export type TFormByResponseIdInputSchema = {
  formResponseId: number;
};

export const ZFormByResponseIdInputSchema: z.ZodType<TFormByResponseIdInputSchema> = z.object({
  formResponseId: z.number(),
});
