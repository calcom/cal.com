import { z } from "zod";

export const appKeysSchema = z.object({
  nextcloudTalkHost: z.string().optional().describe("Your Nextcloud base URL."),
  nextcloudTalkPattern: z.string().optional(),
});

export const appDataSchema = z.object({});
