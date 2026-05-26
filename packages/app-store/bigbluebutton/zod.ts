import { z } from "zod";

export const appKeysSchema = z.object({
  bigBlueButtonServerUrl: z.string().url(),
  bigBlueButtonSharedSecret: z.string().min(1),
  bigBlueButtonMeetingPattern: z.string().optional(),
});

export const appDataSchema = z.object({});
