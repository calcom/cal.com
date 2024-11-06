import { z } from "zod";

export const appKeysSchema = z.object({
  nextcloudTalkHost: z.string().describe("Your Nextcloud base URL"),
  nextcloudTalkPattern: z
    .string()
    .optional()
    .describe(
      "Pattern according to which your created calls are named. You can use the following placeholders: {uuid}, {Title}, {Event Type Title}, {Scheduler}, {Organizer}, {Location} and {Team}"
    ),
  nextcloudTalkClientId: z.string().describe("Your Nextcloud OAuth Client's ID"),
  nextcloudTalkClientSecret: z.string().describe("Your Nextcloud OAuth Client's secret"),
});

export const appDataSchema = z.object({});
