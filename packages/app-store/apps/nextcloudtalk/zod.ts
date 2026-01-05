import { z } from "zod";

export const appKeysSchema = z.object({
  nextcloudTalkHost: z.string(),
  nextcloudTalkPattern: z.string().optional(),
  nextcloudTalkClientId: z.string(),
  nextcloudTalkClientSecret: z.string(),
});

export const appDataSchema = z.object({});
