import { z } from "zod";

export const ZCalIdGetInputSchema = z
  .object({
    includePasswordAdded: z.boolean().optional(),
  })
  .optional();

export type TCalIdGetInputSchema = z.infer<typeof ZCalIdGetInputSchema>;
