import { z } from "zod";

export const appKeysSchema = z.object({
  nextcloudTalkHost: z.string(),
  nextcloudTalkPattern: z.string().optional(),
  nextcloudTalkUser: z.string(),
  nextcloudTalkPassword: z.string(),
});

export const appDataSchema = z.object({});
