import { z } from "zod";

export const appKeysSchema = z.object({
  disabledEvents: z.array(z.string().optional()),
  projectId: z.string(),
  endpoint: z.string(),
  apiKey: z.string(),
});

export type AppKeys = z.infer<typeof appKeysSchema>;

export const appDataSchema = z.object({});
