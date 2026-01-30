import { z } from "zod";

import { WrongAssignmentReportStatus } from "@calcom/prisma/enums";

export const ZUpdateWrongAssignmentReportStatusInputSchema = z.object({
  reportId: z.string().uuid(),
  status: z.nativeEnum(WrongAssignmentReportStatus),
});

export type TUpdateWrongAssignmentReportStatusInputSchema = z.infer<
  typeof ZUpdateWrongAssignmentReportStatusInputSchema
>;
