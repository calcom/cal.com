import { z } from "zod";

export const appKeysSchema = z.object({
  DAILY_API_KEY: z.string(),
  DAILY_SCALE_PLAN: z.string(),
});

export const appDataSchema = z.object({});
