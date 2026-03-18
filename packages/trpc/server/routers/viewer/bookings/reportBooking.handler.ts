import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { getBookingReportService } from "@calcom/features/bookingReport/di/BookingReportService.container";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TReportBookingInputSchema } from "./reportBooking.schema";

type ReportBookingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TReportBookingInputSchema;
  actionSource: ValidActionSource;
};

export const reportBookingHandler = async ({ ctx, input, actionSource }: ReportBookingOptions) => {
  const { user } = ctx;
  const { bookingUid, reason, description, reportType = "EMAIL" } = input;

  const bookingReportService = getBookingReportService();

  return bookingReportService.reportBooking({
    bookingUid,
    reason,
    description,
    reportType,
    userId: user.id,
    userEmail: user.email,
    organizationId: user.organizationId,
    actionSource,
  });
};
