import type { IUpdateAttributeSyncInput } from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";
import {
  attributeSyncRuleSchema,
  fieldMappingWithOptionalIdSchema,
} from "@calcom/features/ee/integration-attribute-sync/schemas/zod";
import { z } from "zod";

export const updateAttributeSyncSchema: z.ZodType<IUpdateAttributeSyncInput> = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  credentialId: z.number().optional(),
  enabled: z.boolean(),
  organizationId: z.number(),
  ruleId: z.string(),
  rule: attributeSyncRuleSchema,
  syncFieldMappings: z.array(fieldMappingWithOptionalIdSchema),
});

export type ZUpdateAttributeSyncSchema = IUpdateAttributeSyncInput;
