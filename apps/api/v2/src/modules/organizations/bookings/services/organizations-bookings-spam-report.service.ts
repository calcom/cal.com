import {
  BookingAccessService,
  handleCancelBooking,
  normalizeWatchlistEmail,
} from "@calcom/platform-libraries";
import { BookingReportReason, BookingReportStatus, BookingStatus, WatchlistType } from "@calcom/prisma/enums";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaBookingReportRepository } from "@/lib/repositories/prisma-booking-report.repository";
import { PrismaWatchlistRepository } from "@/lib/repositories/prisma-watchlist.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

export interface ReportBookingSpamResult {
  bookingUid: string;
  reportedCount: number;
  cancelledCount: number;
  blocklisted: boolean;
  message: string;
}

@Injectable()
export class OrganizationsBookingsSpamReportService {
  private readonly logger = new Logger("OrganizationsBookingsSpamReportService");

  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly bookingRepo: PrismaBookingRepository,
    private readonly bookingReportRepo: PrismaBookingReportRepository,
    private readonly watchlistRepo: PrismaWatchlistRepository
  ) {}

  async reportBookingAsSpam(params: {
    bookingUid: string;
    orgId: number;
    userId: number;
    userEmail: string;
    description?: string;
  }): Promise<ReportBookingSpamResult> {
    const { bookingUid, orgId, userId, userEmail, description } = params;

    const bookingAccessService = new BookingAccessService(this.dbRead.prisma);
    const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
      userId,
      bookingUid,
    });

    if (!hasAccess) {
      throw new ForbiddenException("You don't have access to this booking");
    }

    const booking = await this.bookingRepo.findByUidIncludeReport({ bookingUid });

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.report) {
      throw new BadRequestException("This booking has already been reported");
    }

    const bookerEmail = booking.attendees[0]?.email;
    if (!bookerEmail) {
      throw new BadRequestException("Booking has no attendees");
    }

    let reportedBookingUids: string[] = [bookingUid];
    if (booking.recurringEventId) {
      const remainingBookings = await this.bookingRepo.getActiveRecurringBookingsFromDate({
        recurringEventId: booking.recurringEventId,
        fromDate: booking.startTime,
      });
      reportedBookingUids = remainingBookings.map((b: { uid: string }) => b.uid);
    }

    let createdCount = 0;
    for (const uid of reportedBookingUids) {
      try {
        await this.bookingReportRepo.createReport({
          bookingUid: uid,
          bookerEmail,
          reportedById: userId,
          reason: BookingReportReason.SPAM,
          description,
          cancelled: false,
          organizationId: orgId,
        });
        createdCount++;
      } catch (error) {
        this.logger.warn(`Failed to create report for booking ${uid}: ${error}`);
      }
    }

    const normalizedEmail = normalizeWatchlistEmail(bookerEmail);
    let blocklisted = false;
    let watchlistEntryId: string | null = null;
    try {
      const { watchlistEntry } = await this.watchlistRepo.createEntryFromReport({
        type: WatchlistType.EMAIL,
        value: normalizedEmail,
        organizationId: orgId,
        isGlobal: false,
        userId,
        description: description ?? "Reported as spam via API",
      });
      watchlistEntryId = watchlistEntry.id;
      blocklisted = true;
    } catch (error) {
      this.logger.warn(`Failed to add ${normalizedEmail} to blocklist: ${error}`);
    }

    if (watchlistEntryId) {
      const pendingReports = await this.bookingReportRepo.findPendingReportsByEmail({
        email: normalizedEmail,
        organizationId: orgId,
      });
      if (pendingReports.length > 0) {
        await this.bookingReportRepo.bulkLinkWatchlistWithStatus({
          links: pendingReports.map((r) => ({ reportId: r.id, watchlistId: watchlistEntryId })),
          status: BookingReportStatus.BLOCKED,
        });
      }
    }

    let cancelledCount = 0;
    const upcomingBookings = await this.findUpcomingBookingsByEmailInOrg({
      bookerEmail: normalizedEmail,
      orgId,
    });

    for (const upcomingBooking of upcomingBookings) {
      try {
        await handleCancelBooking({
          bookingData: {
            uid: upcomingBooking.uid,
            cancelledBy: userEmail,
            skipCancellationReasonValidation: true,
          },
          userId,
          impersonatedByUserUuid: null,
          actionSource: "API_V2",
        });
        cancelledCount++;
      } catch (error) {
        this.logger.warn(`Failed to cancel booking ${upcomingBooking.uid}: ${error}`);
      }
    }

    const isRecurring = Boolean(booking.recurringEventId) && createdCount > 1;
    const baseMessage = isRecurring ? `${createdCount} recurring bookings reported` : "Booking reported";

    return {
      bookingUid: reportedBookingUids[0],
      reportedCount: createdCount,
      cancelledCount,
      blocklisted,
      message: `${baseMessage} as spam, ${cancelledCount} booking(s) cancelled, email ${blocklisted ? "added to" : "not added to"} blocklist`,
    };
  }

  private async findUpcomingBookingsByEmailInOrg(params: {
    bookerEmail: string;
    orgId: number;
  }): Promise<Array<{ uid: string }>> {
    const { bookerEmail, orgId } = params;

    return this.dbRead.prisma.booking.findMany({
      where: {
        attendees: {
          some: {
            email: { equals: bookerEmail, mode: "insensitive" },
          },
        },
        startTime: { gt: new Date() },
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.PENDING, BookingStatus.AWAITING_HOST],
        },
        eventType: {
          team: {
            OR: [{ id: orgId }, { parentId: orgId }],
          },
        },
      },
      select: { uid: true },
    });
  }
}
