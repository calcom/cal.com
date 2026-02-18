import type { AbuseMetadata } from "../types";
import { abuseMetadataSchema } from "./abuseMetadataSchema";

/** Type-safe parser for UserAbuseData.abuseData JSONB column */
export function getAbuseMetadata(abuseData: unknown): AbuseMetadata | null {
  if (!abuseData) return null;

  const result = abuseMetadataSchema.safeParse(abuseData);
  if (!result.success) return null;

  return result.data;
}
