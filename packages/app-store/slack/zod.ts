import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const ZSlackCredentialKey = z.object({
  // ok: z.boolean(),
  // app_id: z.string(),
  // scope: z.string(),
  // token_type: z.string(),
  // bot_user_id: z.string(),
  // access_token: z.string(),
  // is_enterprise_install: z.boolean(),
  // team: z.object({
  //   id: z.string(),
  //   name: z.string()
  // }),
  // enterprise: z.object({
  //   id: z.string(),
  //   name: z.string()
  // }).nullable(),
  // authed_user: z.object({
  //   id: z.string(),
  // }),
  incoming_webhook: z.object({
    url: z.string().url(),
    // channel: z.string(),
    // channel_id: z.string(),
    // configurational_url: z.string()
  }),
});
