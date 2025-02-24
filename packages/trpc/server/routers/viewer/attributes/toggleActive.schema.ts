import { z } from "zod";

export const toggleActiveSchema = z.object({
  attributeId: z.string(),
});

export type ZToggleActiveSchema = z.infer<typeof toggleActiveSchema>;
