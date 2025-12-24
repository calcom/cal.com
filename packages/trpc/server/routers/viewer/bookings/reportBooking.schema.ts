import { z } from "zod";

import { BookingReportReason } from "@calcom/prisma/enums";

export type TReportBookingInputSchema = {
  bookingUid: string;
  reason: BookingReportReason;
  description?: string;
};

export const ZReportBookingInputSchema: z.ZodType<TReportBookingInputSchema> = z.object({
  bookingUid: z.string(),
  reason: z.nativeEnum(BookingReportReason),
  description: z.string().optional(),
});
