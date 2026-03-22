import { z } from "zod";

export const appKeysSchema: z.ZodObject<{
  serverUrl: z.ZodString;
  sharedSecret: z.ZodString;
}> = z.object({
  serverUrl: z.string().trim().url(),
  sharedSecret: z.string().trim().min(1),
});

export const appDataSchema: z.ZodObject<Record<string, never>> = z.object({});
