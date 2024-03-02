import { z } from "zod";

export const schemaCredentialGetParams = z.object({
  userId: z.string(),
  appSlug: z.string().optional(),
});
