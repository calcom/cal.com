import { z } from "zod";

export const ZSaveKeysInputSchema = z.object({
  slug: z.string(),
  dirName: z.string(),
  type: z.string(),
  // Validate w/ app specific schema
  keys: z.unknown(),
  fromEnabled: z.boolean().optional(),
});

export type TSaveKeysInputSchema = z.infer<typeof ZSaveKeysInputSchema>;
