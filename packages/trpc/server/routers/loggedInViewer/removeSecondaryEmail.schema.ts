import { z } from "zod";

export const ZRemoveSecondaryEmailInputSchema = z.object({
  id: z.number().int().positive(),
});

export type TRemoveSecondaryEmailInputSchema = z.infer<typeof ZRemoveSecondaryEmailInputSchema>;