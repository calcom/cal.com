import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  app_id: z.string().nonempty(),
  app_secret: z.string().nonempty(),
  open_verfication_token: z.string().nonempty(),
});
