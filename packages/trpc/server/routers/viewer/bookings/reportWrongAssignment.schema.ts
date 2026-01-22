import { AssignmentReasonEnum } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZReportWrongAssignmentInputSchema = z.object({
  bookingUid: z.string(),
  bookingId: z.number(),
  bookingTitle: z.string(),
  bookingStartTime: z.coerce.date(),
  bookingEndTime: z.coerce.date(),
  bookingStatus: z.string(),
  eventTypeId: z.number().nullable(),
  eventTypeTitle: z.string().nullable(),
  eventTypeSlug: z.string().nullable(),
  teamId: z.number().nullable(),
  userId: z.number().nullable(),
  routingReason: z.string().nullable(),
  routingReasonEnum: z.nativeEnum(AssignmentReasonEnum).nullable(),
  guestEmail: z.string(),
  hostEmail: z.string(),
  hostName: z.string().nullable(),
  correctAssignee: z.union([z.string().email(), z.literal("").transform(() => undefined)]).optional(),
  additionalNotes: z.string().min(1),
});

export type TReportWrongAssignmentInputSchema = z.infer<typeof ZReportWrongAssignmentInputSchema>;
