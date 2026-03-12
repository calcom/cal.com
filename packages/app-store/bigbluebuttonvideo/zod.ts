import { z } from "zod";

export const appKeysSchema = z.object({
  bbb_url: z.string().url().optional(),
  bbb_secret: z.string().optional(),
});

export const appDataSchema = z.object({});
