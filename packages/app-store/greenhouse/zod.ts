import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  api_key: z.string().min(1),
  user_id: z.number().min(1),
});
