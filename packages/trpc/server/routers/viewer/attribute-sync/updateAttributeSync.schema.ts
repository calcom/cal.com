import { z } from "zod";

import { syncFormDataSchema } from "@calcom/features/ee/integration-attribute-sync/schemas/zod";

export const updateAttributeSyncSchema = syncFormDataSchema;

export type ZUpdateAttributeSyncSchema = z.infer<typeof updateAttributeSyncSchema>;
