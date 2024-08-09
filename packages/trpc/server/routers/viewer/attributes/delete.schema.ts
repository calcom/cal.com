import { z } from "zod";

export const deleteAttributeSchema = z.object({
  id: z.string(),
});

export type ZDeleteAttributeSchema = z.infer<typeof deleteAttributeSchema>;
