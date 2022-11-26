import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  mode: z.string(),
  region: z.string(),
  api_key: z.string(),
  webhook_secret: z.string(),
});
