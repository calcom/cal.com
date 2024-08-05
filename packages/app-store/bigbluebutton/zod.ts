import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  hash: z.enum(["sha1", "sha256", "sha384", "sha512"]),
});
