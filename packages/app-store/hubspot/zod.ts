import { z } from "zod";

export const appKeysSchema = z.object({
  client_id: z.string().nonempty(),
  client_secret: z.string().nonempty(),
});

export const appDataSchema = z.object({});
