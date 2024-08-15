import { z } from "zod";

export const getAttributeSchema = z.object({
  id: z.string(),
});

export type ZGetAttributeSchema = z.infer<typeof getAttributeSchema>;
