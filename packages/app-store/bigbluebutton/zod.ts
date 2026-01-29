import { z } from "zod";

export const appKeysSchema = z.object({
  url: z.string().url().describe("BigBlueButton server URL (e.g., https://bbb.example.com/bigbluebutton)"),
  salt: z.string().describe("BigBlueButton shared secret (security salt)"),
});

export const appDataSchema = z.object({});
