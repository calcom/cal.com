import { z } from "zod";

export const appDataSchema = z.object({});

export const appKeysSchema = z.object({
  invite_link: z.string().min(1),
});
