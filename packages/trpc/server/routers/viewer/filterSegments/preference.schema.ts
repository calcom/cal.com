import { z } from "zod";

export const ZSetFilterSegmentPreferenceInputSchema = z.object({
  tableIdentifier: z.string(),
  segmentId: z.number().nullable(),
});

export type TSetFilterSegmentPreferenceInputSchema = z.infer<typeof ZSetFilterSegmentPreferenceInputSchema>;
