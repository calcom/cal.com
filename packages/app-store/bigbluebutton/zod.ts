import { z } from "zod";

export const appKeysSchema = z.object({
  bigBlueButtonServerUrl: z.string().url(),
  bigBlueButtonSharedSecret: z.string().min(1),
});

export const appDataSchema = z.object({});
