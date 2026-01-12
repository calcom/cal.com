import { z } from "zod";

import type { ICreateAttributeSyncInput } from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";
import {
  attributeSyncRuleSchema,
  newFieldMappingSchema,
} from "@calcom/features/ee/integration-attribute-sync/schemas/zod";

export const createAttributeSyncSchema: z.ZodType<ICreateAttributeSyncInput> = z.object({
  name: z.string().min(1, "Name is required"),
  credentialId: z.number(),
  rule: attributeSyncRuleSchema,
  syncFieldMappings: z.array(newFieldMappingSchema),
  enabled: z.boolean(),
});

export type ZCreateAttributeSyncSchema = ICreateAttributeSyncInput;
