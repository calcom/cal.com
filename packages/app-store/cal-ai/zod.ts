import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  deepgram_api_key: z.string().min(1),
});
