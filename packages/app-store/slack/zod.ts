import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  access_token: z.string().min(1),
  channel_id: z.string().optional(),
  bridge_token: z.string().optional(),
  webhook_secret: z.string().optional(),
});
