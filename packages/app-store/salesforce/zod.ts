import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  consumer_key: z.string().nonempty(),
  consumer_secret: z.string().nonempty(),
});
