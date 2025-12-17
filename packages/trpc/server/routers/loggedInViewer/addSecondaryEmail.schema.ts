import { z } from "zod";

export type TAddSecondaryEmailInputSchema = {
  email: string;
};

export const ZAddSecondaryEmailInputSchema: z.ZodType<TAddSecondaryEmailInputSchema> = z.object({
  email: z.string(),
});
