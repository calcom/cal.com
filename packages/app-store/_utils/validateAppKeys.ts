import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import type { Prisma } from "@calcom/prisma/client";
/**
 * Determines if an app should be enabled based on whether it has valid keys.
 * This is used by app registration scripts to prevent enabling apps without proper configuration.
 *
 * @param dirName - The directory name of the app
 * @param keys - The keys object (can be undefined/null)
 */
export function shouldEnableApp(dirName: string, keys?: Prisma.JsonValue | null): boolean {
  const keySchema = appKeysSchemas[dirName as keyof typeof appKeysSchemas];

  // If no schema, the app doesn't require keys - can be enabled
  if (!keySchema) {
    return true;
  }

  // If keys is null/undefined, check if the schema accepts an empty object.
  if (keys === null || keys === undefined) {
    const emptyObjectResult = keySchema.safeParse({});
    return emptyObjectResult.success;
  }

  // Validate keys against schema
  const result = keySchema.safeParse(keys);
  return result.success;
}
