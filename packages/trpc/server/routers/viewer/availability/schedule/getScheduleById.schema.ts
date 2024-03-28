import { z } from "zod";

export const ZGetByIdInputSchema = z.object({
  id: z.optional(z.number()),
});

export type TGetByIdInputSchema = z.infer<typeof ZGetByIdInputSchema>;
