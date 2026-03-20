import { extractDomainFromEmail, isUpcomingBooking } from "@calcom/platform-libraries/bookings";
import type { BookingReportReason } from "@calcom/prisma/enums";
import { BadRequestException, Injectable } from "@nestjs/common";
import { BookingReportService } from "@/lib/services/booking-report.service";

interface ReportInput {
  bookingUid: string;
  reason: BookingReportReason;
  description?: string;
  reportType: "EMAIL" | "DOMAIN";
  userId: number;
  userEmail: string;
  organizationId: number;
  actionSource: "API_V2";
}

interface ReportResult {
  success: boolean;
  message: string;
  bookingUid: string;
  reportedCount: number;
  cancelledCount: number;
}

@Injectable()
export class OrganizationsBookingsReportService {
  constructor(private readonly bookingReportService: BookingReportService) {}

  async report(input: ReportInput): Promise<ReportResult> {
    const { booking, bookerEmail } = await this.bookingReportService.validateOrgBooking({
      bookingUid: input.bookingUid,
      organizationId: input.organizationId,
      reportType: input.reportType,
    });

    const { bookingUid, reason, description, reportType, userId, userEmail, organizationId, actionSource } =
      input;

    if (booking.report) {
      throw new BadRequestException("This booking has already been reported");
    }

    const orgBookings = await this.bookingReportService.findUpcomingUnreportedOrgBookings({
      reportType,
      bookerEmail,
      organizationId,
    });

    const bookingsToCancelUids: string[] = [];
    if (isUpcomingBooking(booking)) {
      bookingsToCancelUids.push(bookingUid);
    }

    const orgAdditionalUids = orgBookings.filter((b) => b.uid !== bookingUid).map((b) => b.uid);
    bookingsToCancelUids.push(...orgAdditionalUids);

    const { cancelledUids } = await this.bookingReportService.cancelReportedBookings({
      bookingUids: bookingsToCancelUids,
      originalBooking: booking,
      userEmail,
      userId,
      actionSource,
      organizationId,
    });

    const reportEmail = reportType === "DOMAIN" ? `@${extractDomainFromEmail(bookerEmail)}` : bookerEmail;

    await this.bookingReportService.createReport({
      bookingUid,
      bookerEmail: reportEmail,
      reportedById: userId,
      reason,
      description,
      cancelled: cancelledUids.has(bookingUid),
      organizationId,
    });

    const cancelledCount = cancelledUids.size;
    const message =
      cancelledCount > 0 ? "Booking reported and cancelled successfully" : "Booking reported successfully";

    return {
      success: true,
      message,
      bookingUid,
      reportedCount: 1,
      cancelledCount,
    };
  }
}
