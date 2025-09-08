import { z } from "zod";

export const editAttributeSchema = z.object({
  attributeId: z.string(),
  name: z.string(),
  type: z.enum(["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"]),
  isLocked: z.boolean().optional(),
  isWeightsEnabled: z.boolean().optional(),
  options: z.array(
    z.object({
      value: z.string(),
      id: z.string().optional(),
      isGroup: z.boolean().optional(),
      contains: z.array(z.string()).optional(),
    })
  ),
});

export type ZEditAttributeSchema = z.infer<typeof editAttributeSchema>;
