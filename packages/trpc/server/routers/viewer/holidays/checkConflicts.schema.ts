import { z } from "zod";

export const ZCheckConflictsSchema = z.object({
  countryCode: z.string(),
  disabledIds: z.array(z.string()).optional().default([]),
});

export type TCheckConflictsSchema = z.infer<typeof ZCheckConflictsSchema>;

