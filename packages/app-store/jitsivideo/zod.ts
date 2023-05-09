import { z } from "zod";

export const appKeysSchema = z.object({
  jitsi_host: z.string().default("https://meet.jit.si"),
  jitsi_slug_pattern: z.string().default("{Title}-{Uuid}"),
});

export const appDataSchema = z.object({});
