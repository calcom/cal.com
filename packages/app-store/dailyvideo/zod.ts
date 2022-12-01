import { z } from "zod";

export const appKeysSchema = z.object({
  api_key: z.string().nonempty(),
  scale_plan: z.string(),
});

export const appDataSchema = z.object({});
