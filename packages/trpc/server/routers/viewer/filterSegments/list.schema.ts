import { z } from "zod";

export const ZListFilterSegmentsInputSchema = z.object({
  tableIdentifier: z.string(),
});

export type TListFilterSegmentsInputSchema = z.infer<typeof ZListFilterSegmentsInputSchema>;
