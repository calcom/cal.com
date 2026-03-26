import { z } from "zod";

export const ZReportWrongAssignmentInputSchema = z.object({
  bookingUid: z.string(),
  correctAssignee: z.union([z.string().email(), z.literal("").transform(() => undefined)]).optional(),
  additionalNotes: z.string().min(1),
});

export type TReportWrongAssignmentInputSchema = z.infer<typeof ZReportWrongAssignmentInputSchema>;
