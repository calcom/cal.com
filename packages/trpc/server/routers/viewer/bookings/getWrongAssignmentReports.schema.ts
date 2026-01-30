import { z } from "zod";

import { WrongAssignmentReportStatus } from "@calcom/prisma/enums";

export const ZGetWrongAssignmentReportsInputSchema = z.object({
  teamId: z.number(),
  status: z.enum(["pending", "reviewed"]),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

export type TGetWrongAssignmentReportsInputSchema = z.infer<typeof ZGetWrongAssignmentReportsInputSchema>;

export const statusToEnumMap = {
  pending: [WrongAssignmentReportStatus.PENDING],
  reviewed: [
    WrongAssignmentReportStatus.REVIEWED,
    WrongAssignmentReportStatus.RESOLVED,
    WrongAssignmentReportStatus.DISMISSED,
  ],
} as const;
