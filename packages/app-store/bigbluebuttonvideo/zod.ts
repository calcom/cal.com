import { z } from "zod";

export const appKeysSchema = z.object({
  bbbHost: z.string().optional(),
  bbbSecret: z.string().optional(),
});
