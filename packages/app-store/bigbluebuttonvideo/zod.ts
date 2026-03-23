import { z } from "zod";

export const appKeysSchema = z.object({
  serverUrl: z.string().min(1, "BigBlueButton server URL is required"),
  sharedSecret: z.string().min(1, "BigBlueButton shared secret is required"),
});

export const appDataSchema = z.object({});
