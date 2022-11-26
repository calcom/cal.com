import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  app_id: z.string(),
  app_secret: z.string(),
  open_verfication_token: z.string(),
});
