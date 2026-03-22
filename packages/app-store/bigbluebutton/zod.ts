import { z } from "zod";

export const appKeysSchema = z.object({
  serverUrl: z.string().url("Please provide a valid server URL"),
  sharedSecret: z.string().trim().min(8, "Shared secret must be at least 8 characters").refine(
    (value) => value.trim() === value && value.length > 0, 
    "Shared secret cannot be empty or contain only whitespace"
  ),
});

export const appDataSchema = z.object({});