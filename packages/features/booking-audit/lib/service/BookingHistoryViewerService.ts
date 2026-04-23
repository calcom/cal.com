import type { BookingAuditViewerService, DisplayBookingAuditLog } from "./BookingAuditViewerService";

type GetHistoryForBookingParams = {
  bookingUid: string;
  userId: number;
  userEmail: string;
  userTimeZone: string;
  organizationId: number | null;
};

type BookingHistoryLog = DisplayBookingAuditLog;

interface BookingHistoryViewerServiceDeps {
  bookingAuditViewerService: BookingAuditViewerService;
}

export class BookingHistoryViewerService {
  private readonly bookingAuditViewerService: BookingAuditViewerService;

  constructor(private readonly deps: BookingHistoryViewerServiceDeps) {
    this.bookingAuditViewerService = deps.bookingAuditViewerService;
  }

  private sortLogsReverseChronologically(historyLogs: BookingHistoryLog[]): BookingHistoryLog[] {
    return historyLogs.sort((a, b) => {
      const timestampA = new Date(a.timestamp).getTime();
      const timestampB = new Date(b.timestamp).getTime();
      return timestampB - timestampA;
    });
  }

  async getHistoryForBooking(
    params: GetHistoryForBookingParams
  ): Promise<{ bookingUid: string; auditLogs: BookingHistoryLog[] }> {
    const { bookingUid } = params;

    const { auditLogs: bookingAuditLogs } =
      await this.bookingAuditViewerService.getAuditLogsForBooking(params);

    const sortedLogs = this.sortLogsReverseChronologically(bookingAuditLogs);

    return {
      bookingUid,
      auditLogs: sortedLogs,
    };
  }
}
