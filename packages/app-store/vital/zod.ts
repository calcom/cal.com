import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  mode: z.string().nonempty(),
  region: z.string().nonempty(),
  api_key: z.string().nonempty(),
  webhook_secret: z.string().nonempty(),
});
