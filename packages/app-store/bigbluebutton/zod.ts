import { z } from "zod";

export const checksumAlgorithmSchema = z
  .enum(["sha1", "sha256", "sha384", "sha512"])
  .default("sha256");

export const appKeysSchema = z.object({
  serverUrl: z.string().url("Must be a valid URL"),
  sharedSecret: z.string().min(1, "Shared secret is required"),
  // Note: do NOT wrap checksumAlgorithmSchema with .optional() — in Zod v3, .optional()
  // takes precedence over .default(), causing missing input to yield undefined instead of "sha256".
  // The .default("sha256") on checksumAlgorithmSchema already handles missing/undefined input.
  checksumAlgorithm: checksumAlgorithmSchema,
});

export type AppKeys = z.infer<typeof appKeysSchema>;

export const appDataSchema = z.object({});
