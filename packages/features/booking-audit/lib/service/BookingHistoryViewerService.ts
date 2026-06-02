import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { DisplayBookingAuditLog } from "./BookingAuditViewerService";
import type { BookingAuditViewerService } from "./BookingAuditViewerService";
import { BookingActivitySupplementaryDataFetcher } from "./BookingActivitySupplementaryDataFetcher";
import {
  BookingActivityTimelineBuilder,
  type DisplayBookingActivityLog,
} from "./BookingActivityTimelineBuilder";

type GetHistoryForBookingParams = {
  bookingUid: string;
  userId: number;
  userEmail: string;
  userTimeZone: string;
  organizationId: number | null;
};

interface BookingHistoryViewerServiceDeps {
  bookingAuditViewerService: BookingAuditViewerService;
  bookingRepository: BookingRepository;
}

export class BookingHistoryViewerService {
  private readonly bookingAuditViewerService: BookingAuditViewerService;
  private readonly supplementaryDataFetcher: BookingActivitySupplementaryDataFetcher;
  private readonly timelineBuilder: BookingActivityTimelineBuilder;

  constructor(private readonly deps: BookingHistoryViewerServiceDeps) {
    this.bookingAuditViewerService = deps.bookingAuditViewerService;
    this.supplementaryDataFetcher = new BookingActivitySupplementaryDataFetcher({
      bookingRepository: deps.bookingRepository,
    });
    this.timelineBuilder = new BookingActivityTimelineBuilder();
  }

  async getHistoryForBooking(
    params: GetHistoryForBookingParams
  ): Promise<{ bookingUid: string; auditLogs: DisplayBookingActivityLog[] }> {
    const { bookingUid } = params;

    const { auditLogs: bookingAuditLogs } =
      await this.bookingAuditViewerService.getAuditLogsForBooking(params);

    const hasCreatedAuditLog = bookingAuditLogs.some((log) => log.action === "CREATED");

    const supplementaryData = await this.supplementaryDataFetcher.fetchForBooking({
      bookingUid,
      hasCreatedAuditLog,
    });

    const activityLogs = this.timelineBuilder.build({
      auditLogs: bookingAuditLogs,
      supplementaryData,
    });

    return {
      bookingUid,
      auditLogs: activityLogs,
    };
  }
}

export type { DisplayBookingActivityLog, DisplayBookingAuditLog };
