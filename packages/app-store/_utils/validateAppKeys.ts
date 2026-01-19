import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import type { Prisma } from "@calcom/prisma/client";
/**
 * Determines if an app should be enabled based on whether it has valid keys.
 * 
 * @param dirName - The directory name of the app
 * @param keys - The keys object (can be undefined/null)
 * @returns true if the app can be enabled, false otherwise
 */
export function shouldEnableApp(dirName: string, keys?: Prisma.JsonValue | null): boolean {
  const keySchema = appKeysSchemas[dirName as keyof typeof appKeysSchemas];
  
  // If no schema, the app doesn't require keys - can be enabled
  if (!keySchema) {
    return true;
  }

  const result = keySchema.safeParse(keys);
  return result.success;
}
