import { z } from "zod";

export const ZEnableOOOSyncSchema = z.object({
  enabled: z.boolean(),
  credentialId: z.number().optional(),
});

export type TEnableOOOSyncInput = z.infer<typeof ZEnableOOOSyncSchema>;
