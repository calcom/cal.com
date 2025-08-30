import { z } from "zod";

export const appKeysSchema = z.object({
  jitsiHost: z.string().optional(),
  jitsiPathPattern: z.string().optional(),
});

export const appDataSchema = z.object({});
