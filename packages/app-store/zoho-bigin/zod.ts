import { z } from "zod";

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});
export const appDataSchema = z.object({});
