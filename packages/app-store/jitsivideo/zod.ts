import { z } from "zod";

export const appKeysSchema = z.object({
  YourJitsiURL: z.string().optional(),
  jitsiPathPattern: z.string().optional(),
});

export const appDataSchema = z.object({});
