import { z } from "zod";

export type TFormByResponseIdInputSchema = {
  formResponseId: number;
};

export const ZFormByResponseIdInputSchema = z.object({
  formResponseId: z.number(),
});
