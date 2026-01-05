import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  app_id: z.string().min(1),
  app_secret: z.string().min(1),
  open_verfication_token: z.string().min(1),
});
