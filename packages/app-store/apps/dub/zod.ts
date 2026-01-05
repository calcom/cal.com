import { z } from "zod";

export const appKeysSchema = z.object({
  redirect_uris: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
});

export const appDataSchema = z.object({});
