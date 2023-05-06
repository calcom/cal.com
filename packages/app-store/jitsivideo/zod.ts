import { z } from "zod";

export const appKeysSchema = z.object({
  jitsi_host: z.string(),
});

export const appDataSchema = z.object({});
