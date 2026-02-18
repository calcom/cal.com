import { z } from "zod";

export const checksumAlgorithmSchema = z
  .enum(["sha1", "sha256", "sha384", "sha512"])
  .default("sha256");

export const appKeysSchema = z.object({
  serverUrl: z.string().url("Must be a valid URL"),
  sharedSecret: z.string().min(1, "Shared secret is required"),
  checksumAlgorithm: checksumAlgorithmSchema.optional(),
});

export type AppKeys = z.infer<typeof appKeysSchema>;

export const appDataSchema = z.object({});
