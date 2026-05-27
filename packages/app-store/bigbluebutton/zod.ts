import { z } from "zod";

export const appKeysSchema: z.ZodType<{
  bigBlueButtonServerUrl: string;
  bigBlueButtonSharedSecret: string;
}> = z.object({
  bigBlueButtonServerUrl: z.string().url(),
  bigBlueButtonSharedSecret: z.string().min(1),
});

export const appDataSchema: z.ZodType<Record<string, never>> = z.object({});
