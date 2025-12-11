import { z } from "zod";

import { attributeSyncRuleSchema } from "@calcom/features/ee/integration-attribute-sync/schemas/zod";

const fieldMappingSchema = z.object({
  integrationFieldName: z.string().min(1),
  attributeId: z.string(),
  enabled: z.boolean(),
});

export const createAttributeSyncSchema = z.object({
  credentialId: z.number(),
  rule: attributeSyncRuleSchema,
  fieldMappings: z.array(fieldMappingSchema),
  enabled: z.boolean().default(true),
});

export type ZCreateAttributeSyncSchema = z.infer<typeof createAttributeSyncSchema>;
