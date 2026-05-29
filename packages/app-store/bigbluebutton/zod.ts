import { z } from "zod";

export const appKeysSchema = z.object({
  bbbUrl: z.string().url(),
  bbbSecret: z.string().min(1),
});

export const appDataSchema = z.object({});
