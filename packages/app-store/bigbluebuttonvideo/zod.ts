import { z } from "zod";

export const appKeysSchema = z.object({
  bigBlueButtonHost: z.string().url(),
  bigBlueButtonSharedSecret: z.string().min(1),
  bigBlueButtonModeratorPassword: z.string().optional(),
  bigBlueButtonPathPattern: z.string().optional(),
});

export const appDataSchema = z.object({});
