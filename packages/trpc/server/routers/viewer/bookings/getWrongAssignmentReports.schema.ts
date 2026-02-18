import { z } from "zod";

import { WrongAssignmentReportStatus } from "@calcom/prisma/enums";

export const ZGetWrongAssignmentReportsInputSchema = z.object({
  teamId: z.number(),
  isAll: z.boolean().default(false),
  status: z.enum(["pending", "handled"]),
  routingFormId: z.string().nullish(),
  reportedById: z.number().nullish(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

export type TGetWrongAssignmentReportsInputSchema = z.infer<typeof ZGetWrongAssignmentReportsInputSchema>;

export const statusToEnumMap = {
  pending: [WrongAssignmentReportStatus.PENDING],
  handled: [
    WrongAssignmentReportStatus.REVIEWED,
    WrongAssignmentReportStatus.RESOLVED,
    WrongAssignmentReportStatus.DISMISSED,
  ],
} as const;
