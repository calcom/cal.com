import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysData = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uris: z.string(),
});
