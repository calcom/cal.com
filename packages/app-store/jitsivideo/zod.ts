import { z } from "zod";

export const appKeysSchema = z.object({
  jitsiHost: z.string().optional().describe("If you self-host Jitsi enter your Jitsi base URL here"),
  jitsiPathPattern: z
    .string()
    .optional()
    .describe(
      "Pattern according to which your created calls are named. You can use the following placeholders: {uuid}, {Title}, {Event Type Title}, {Scheduler}, {Organizer}, {Location} and {Team}"
    ),
});

export const appDataSchema = z.object({});
