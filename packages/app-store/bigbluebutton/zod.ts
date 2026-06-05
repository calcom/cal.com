import { z } from "zod";

/**
 * Zod schema for BigBlueButton app keys stored in the database.
 * Requires a valid BBB server URL and a non-empty shared secret.
 */
export const appKeysSchema = z.object({
  bbb_url: z.string().url(),
  bbb_secret: z.string().min(1),
});

/** Zod schema for BigBlueButton app-specific data (currently unused). */
export const appDataSchema = z.object({});
