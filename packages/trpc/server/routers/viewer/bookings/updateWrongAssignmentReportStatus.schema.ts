import { WrongAssignmentReportStatus } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZUpdateWrongAssignmentReportStatusInputSchema = z.object({
  reportId: z.string().uuid(),
  status: z.nativeEnum(WrongAssignmentReportStatus),
});

export type TUpdateWrongAssignmentReportStatusInputSchema = z.infer<
  typeof ZUpdateWrongAssignmentReportStatusInputSchema
>;
