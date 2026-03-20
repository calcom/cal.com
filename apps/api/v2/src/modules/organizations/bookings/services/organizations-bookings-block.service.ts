import {
  extractDomainFromEmail,
  isUpcomingBooking,
  OrganizationWatchlistOperationsService,
  PermissionCheckService,
} from "@calcom/platform-libraries/bookings";
import { WatchlistType } from "@calcom/prisma/enums";
import { Injectable } from "@nestjs/common";
import { PrismaBookingReportRepository } from "@/lib/repositories/prisma-booking-report.repository";
import { PrismaWatchlistRepository } from "@/lib/repositories/prisma-watchlist.repository";
import { BookingReportService } from "@/lib/services/booking-report.service";

interface BlockInput {
  bookingUid: string;
  blockType: "EMAIL" | "DOMAIN";
  userId: number;
  userEmail: string;
  organizationId: number;
  actionSource: "API_V2";
}

interface BlockResult {
  success: boolean;
  message: string;
  bookingUid: string;
  cancelledCount: number;
  blockedValue: string;
}

@Injectable()
export class OrganizationsBookingsBlockService {
  constructor(
    private readonly bookingReportService: BookingReportService,
    private readonly watchlistRepo: PrismaWatchlistRepository,
    private readonly bookingReportRepo: PrismaBookingReportRepository
  ) {}

  private createWatchlistService(organizationId: number): OrganizationWatchlistOperationsService {
    return new OrganizationWatchlistOperationsService({
      watchlistRepo: this.watchlistRepo,
      bookingReportRepo: this.bookingReportRepo,
      permissionCheckService: new PermissionCheckService(),
      organizationId,
    });
  }

  async block(input: BlockInput): Promise<BlockResult> {
    const { booking, bookerEmail } = await this.bookingReportService.validateOrgBooking({
      bookingUid: input.bookingUid,
      organizationId: input.organizationId,
      reportType: input.blockType,
    });

    const { bookingUid, blockType, userId, userEmail, organizationId, actionSource } = input;

    const watchlistService = this.createWatchlistService(organizationId);
    await watchlistService.addToWatchlistByEmail({
      email: bookerEmail,
      type: blockType === "DOMAIN" ? WatchlistType.DOMAIN : WatchlistType.EMAIL,
      userId,
    });

    const orgBookings = await this.bookingReportService.findUpcomingUnreportedOrgBookings({
      reportType: blockType,
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

    const cancelledCount = cancelledUids.size;
    const blockedValue = blockType === "DOMAIN" ? extractDomainFromEmail(bookerEmail) : bookerEmail;

    const message =
      cancelledCount > 0
        ? `Added to blocklist and ${cancelledCount} booking${cancelledCount > 1 ? "s" : ""} cancelled`
        : "Added to blocklist";

    return {
      success: true,
      message,
      bookingUid,
      cancelledCount,
      blockedValue,
    };
  }
}
