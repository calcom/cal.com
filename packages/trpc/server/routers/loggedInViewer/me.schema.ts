import { z } from "zod";

export const ZMeInputSchema = z
  .object({
    includePasswordAdded: z.boolean().optional(),
  })
  .optional();

export type TMeInputSchema = z.infer<typeof ZMeInputSchema>;
