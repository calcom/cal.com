import { z } from "zod";

export const appKeysSchema = z.object({
  bbb_url: z.string().url(),
  bbb_secret: z.string().min(1),
});

export const appDataSchema = z.object({});
