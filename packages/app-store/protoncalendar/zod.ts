import { z } from "zod";

export const appKeysSchema = z.object({
  protonIcsFeedUrl: z.string().url().optional(),
});

export const appDataSchema = z.object({});
