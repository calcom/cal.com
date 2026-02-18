import { z } from "zod";

export const previewApplySyncSchema = z.object({
  syncId: z.string(),
});

export type ZPreviewApplySyncSchema = z.infer<typeof previewApplySyncSchema>;
