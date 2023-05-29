import { z } from "zod";

export const checkGlobalKeysSchema = z.object({
  slug: z.string(),
});

export type CheckGlobalKeysSchemaType = z.infer<typeof checkGlobalKeysSchema>;
