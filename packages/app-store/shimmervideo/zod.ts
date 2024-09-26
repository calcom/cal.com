import { z } from "zod";

export const appKeysSchema = z.object({
  api_key: z.string(),
  api_route: z.string(),
});

export const appDataSchema = z.object({});
