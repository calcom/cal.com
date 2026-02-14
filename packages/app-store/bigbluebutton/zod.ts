import { z } from "zod";

export const appKeysSchema = z.object({
  bbbUrl: z.string().url().optional(),
  bbbSecret: z.string().optional(),
});

export const appDataSchema = z.object({});
