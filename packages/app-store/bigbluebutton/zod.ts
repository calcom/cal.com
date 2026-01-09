import { z } from "zod";

export const appKeysSchema = z.object({
  bbbUrl: z.string().url().describe("BigBlueButton server URL (e.g., https://bbb.example.com)"),
  bbbSecret: z.string().min(1).describe("BigBlueButton shared secret"),
});

export const appDataSchema = z.object({});
