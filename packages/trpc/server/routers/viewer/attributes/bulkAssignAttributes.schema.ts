import { z } from "zod";

const attributeSchema = z.object({
  id: z.string(),
  options: z.array(z.object({ label: z.string().optional(), value: z.string() })).optional(),
  value: z.string().optional(),
});

export const bulkAssignAttributesSchema = z.object({
  userIds: z.number().array(),
  attributes: attributeSchema.array(),
});

export type ZBulkAssignAttributes = z.infer<typeof bulkAssignAttributesSchema>;
