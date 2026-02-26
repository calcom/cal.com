import { BookingReportReason } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZReportBookingInputSchema = z.object({
  bookingUid: z.string(),
  reason: z.nativeEnum(BookingReportReason),
  description: z.string().optional(),
  reportType: z.enum(["EMAIL", "DOMAIN"]).default("EMAIL"),
});

export type TReportBookingInputSchema = z.infer<typeof ZReportBookingInputSchema>;
