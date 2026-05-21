import { z } from "zod";

export const appKeysSchema = z.object({
  bigBlueButtonHost: z.string().url().optional(),
  bigBlueButtonPathPattern: z.string().optional(),
});

export const appDataSchema = z.object({});
