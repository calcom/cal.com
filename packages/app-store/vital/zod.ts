import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  mode: z.string().min(1),
  region: z.string().min(1),
  api_key: z.string().min(1),
  webhook_secret: z.string().min(1),
});
