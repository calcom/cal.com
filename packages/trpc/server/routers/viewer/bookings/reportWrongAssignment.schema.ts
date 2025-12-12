import { z } from "zod";

export const ZReportWrongAssignmentInputSchema = z.object({
  bookingUid: z.string(),
  correctAssignee: z.string().email().optional(),
  additionalNotes: z.string().min(1),
});

export type TReportWrongAssignmentInputSchema = z.infer<typeof ZReportWrongAssignmentInputSchema>;
