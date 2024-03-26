import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
});
