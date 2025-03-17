import { z } from "zod";

export const ZGetInputSchema = z
  .object({
    includePasswordAdded: z.boolean().optional(),
  })
  .optional();

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
