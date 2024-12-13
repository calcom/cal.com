import { z } from "zod";

const attributeSchema = z.object({
  id: z.string(),
  options: z
    .array(z.object({ label: z.string().optional(), value: z.string(), weight: z.number().optional() }))
    .optional(),
  value: z.string().optional(),
});

export const assignUserToAttributeSchema = z.object({
  userId: z.number(),
  attributes: attributeSchema.array(),
});

export type ZAssignUserToAttribute = z.infer<typeof assignUserToAttributeSchema>;
