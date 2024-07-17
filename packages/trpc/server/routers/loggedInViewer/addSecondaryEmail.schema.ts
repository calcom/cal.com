import { z } from "zod";

export const ZAddSecondaryEmailInputSchema = z.object({
  email: z.string(),
});

export type TAddSecondaryEmailInputSchema = z.infer<typeof ZAddSecondaryEmailInputSchema>;
