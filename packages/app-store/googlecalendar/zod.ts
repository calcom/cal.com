import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  client_id: z.string().nonempty(),
  client_secret: z.string().nonempty(),
  redirect_uris: z.string().nonempty(),
});
