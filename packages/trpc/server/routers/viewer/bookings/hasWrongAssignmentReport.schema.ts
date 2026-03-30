import { z } from "zod";

export const ZHasWrongAssignmentReportInputSchema = z.object({
  bookingUid: z.string(),
});

export type THasWrongAssignmentReportInputSchema = z.infer<typeof ZHasWrongAssignmentReportInputSchema>;
