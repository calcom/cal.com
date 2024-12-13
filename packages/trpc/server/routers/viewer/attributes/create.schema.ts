import { z } from "zod";

export const createAttributeSchema = z.object({
  name: z.string(),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  isLocked: z.boolean().optional(),
  options: z.array(z.object({ value: z.string() })),
});

export type ZCreateAttributeSchema = z.infer<typeof createAttributeSchema>;
