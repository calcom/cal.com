import { z } from "zod";

export const appKeysSchema = z.object({
  serverUrl: z.string().url("Please provide a valid server URL"),
  sharedSecret: z.string().min(1, "Shared secret is required"),
});

export const appDataSchema = z.object({});