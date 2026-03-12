import { z } from "zod";

export const appKeysSchema = z.object({
  serverUrl: z.string().url().min(1),
  secret: z.string().min(1),
});

export const appDataSchema = z.object({});
