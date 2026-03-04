import { z } from "zod";

export const appKeysSchema = z.object({
  bigBlueButtonServerUrl: z.string().url().optional(),
  bigBlueButtonSecret: z.string().optional(),
});

export const appDataSchema = z.object({});
