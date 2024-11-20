import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  redirect_uris: z.union([
    z.string().url().array(),
    z
      .string()
      .url()
      .transform((url) => [url]),
  ]),
});
