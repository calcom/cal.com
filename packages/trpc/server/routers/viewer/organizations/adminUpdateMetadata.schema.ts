import { z } from "zod";

export const ZAdminUpdateMetadataSchema = z.object({
  id: z.number(),
  metadata: z.record(z.string(), z.string()),
});

export type TAdminUpdateMetadataSchema = z.infer<typeof ZAdminUpdateMetadataSchema>;
