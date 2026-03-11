import { z } from "zod";

export const appKeysSchema = z.object({
  bigBlueButtonUrl: z
    .string()
    .url("BigBlueButton server URL must be a valid URL")
    .refine((url) => url.endsWith("/"), {
      message: "BigBlueButton server URL must end with a trailing slash",
    }),
  bigBlueButtonSecret: z.string().min(1, "BigBlueButton shared secret is required"),
});

export const appDataSchema = z.object({});

export type BigBlueButtonKeys = z.infer<typeof appKeysSchema>;
