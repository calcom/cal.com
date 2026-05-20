import { z } from "zod";

export const appKeysSchema = z.object({
  bigBlueButtonServerUrl: z.string().url().optional(),
  bigBlueButtonSharedSecret: z.string().min(1).optional(),
});

export const appDataSchema = z.object({});
