import { z } from "zod";

export const ZOutOfOfficeCustomReasonDeleteSchema = z.object({
  id: z.number().int().positive(),
});

export type TOutOfOfficeCustomReasonDeleteSchema = z.infer<typeof ZOutOfOfficeCustomReasonDeleteSchema>;
