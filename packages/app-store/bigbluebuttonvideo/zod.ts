import { z } from "zod";

export const appKeysSchema = z.object({
  bbb_url: z.string().url({ message: "A valid BigBlueButton server URL is required" }),
  bbb_secret: z.string().min(1, { message: "BigBlueButton shared secret is required" }),
});

export const appDataSchema = z.object({});
