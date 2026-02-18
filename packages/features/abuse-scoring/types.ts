import type { z } from "zod";

import type { abuseMetadataSchema } from "./lib/abuseMetadataSchema";

/** Shape of UserAbuseData.abuseData JSONB column */
export type AbuseMetadata = z.infer<typeof abuseMetadataSchema>;
export type AbuseFlag = AbuseMetadata["flags"][number];
export type AbuseSignal = AbuseMetadata["signals"][number];

export interface SignupCheckResult {
  flagged: boolean;
  flags: AbuseFlag[];
  initialScore: number;
}
