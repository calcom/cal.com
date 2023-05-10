import { z } from "zod";

export const appKeysSchema = z.object({
  jitsiHost: z.string().default("https://meet.jit.si/cal"),
});

export const appDataSchema = z.object({});
