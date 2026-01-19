import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import type { Prisma } from "@calcom/prisma/client";
import type { z } from "zod";

/**
 * Checks if an app has all required keys set and non-empty.
 * Returns true if:
 * - App has no key schema (no keys required)
 * - App has a key schema and all required keys are present and non-empty
 * Returns false if:
 * - App has a key schema but keys are missing or empty
 * 
 * @param dirName - The directory name of the app
 * @param keys - The keys object from the database
 */
export async function hasRequiredAppKeys(
  dirName: string,
  keys: Prisma.JsonValue
): Promise<boolean> {
  const keySchema = appKeysSchemas[dirName as keyof typeof appKeysSchemas];
  
  // If no schema, the app doesn't require keys
  if (!keySchema) {
    return true;
  }

  // Validate keys against schema using safeParse
  const result = keySchema.safeParse(keys);

  return result.success;
}
