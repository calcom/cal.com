import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { isUpcomingBooking } from "@calcom/features/bookings/lib/isUpcomingBooking";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import type { OrganizationSettingsRepository } from "@calcom/features/organizations/repositories/OrganizationSettingsRepository";
import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { extractDomainFromEmail } from "@calcom/features/watchlist/lib/utils/normalization";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import type { CreateBookingReportInput } from "../repositories/IBookingReportRepository";
import type { PrismaBookingReportRepository } from "../repositories/PrismaBookingReportRepository";

type BookingForReport = NonNullable<Awaited<ReturnType<BookingRepository["findByUidIncludeReport"]>>>;
export type BookingForOrgReport = NonNullable<
  Awaited<ReturnType<BookingRepository["findByUidIncludeReportAndEventType"]>>
>;

type AdditionalBooking = {
  uid: string;
  report: { id: string } | null;
  attendees: { email: string }[];
};

export interface ReportBookingInput {
  bookingUid: string;
  reason: CreateBookingReportInput["reason"];
  description?: string;
  reportType: "EMAIL" | "DOMAIN";
  userId: number;
  userEmail: string;
  organizationId?: number | null;
  actionSource: ValidActionSource;
}

export interface CancelReportedBookingsInput {
  bookingUids: string[];
  originalBooking: BookingForReport;
  userEmail: string;
  userId: number;
  actionSource: ValidActionSource;
  organizationId?: number | null;
}

export interface CancelReportedBookingsResult {
  cancelledUids: Set<string>;
}

export interface ReportBookingResult {
  success: boolean;
  message: string;
  bookingUid: string;
  reportedCount: number;
}

export interface ValidateOrgBookingResult {
  booking: BookingForOrgReport;
  bookerEmail: string;
}

interface Deps {
  bookingRepo: BookingRepository;
  bookingReportRepo: PrismaBookingReportRepository;
  bookingAccessService: BookingAccessService;
  organizationSettingsRepo: OrganizationSettingsRepository;
}

export class BookingReportService {
  private readonly log = logger.getSubLogger({ prefix: ["BookingReportService"] });

  constructor(private readonly deps: Deps) {}

  async reportBooking(input: ReportBookingInput): Promise<ReportBookingResult> {
    const { bookingUid, reason, description, reportType, userId, userEmail, organizationId, actionSource } =
      input;

    const hasAccess = await this.deps.bookingAccessService.doesUserIdHaveAccessToBooking({
      userId,
      bookingUid,
    });

    if (!hasAccess) {
      throw ErrorWithCode.Factory.Forbidden("You don't have access to this booking");
    }

    const booking = await this.deps.bookingRepo.findByUidIncludeReportAndEventType({ bookingUid });

    if (!booking) {
      throw ErrorWithCode.Factory.NotFound("Booking not found");
    }

    if (organizationId && !this.bookingBelongsToOrg(booking, organizationId)) {
      throw ErrorWithCode.Factory.Forbidden("Booking does not belong to this organization");
    }

    if (booking.report) {
      throw ErrorWithCode.Factory.BadRequest("This booking has already been reported");
    }

    const bookerEmail = booking.attendees[0]?.email;
    if (!bookerEmail) {
      throw ErrorWithCode.Factory.BadRequest("Booking has no attendees");
    }

    // Use the booking's actual host for email/domain queries (the reporting user
    // may have access through team/org admin but not be the direct host)
    const hostUserId = booking.userId ?? userId;

    if (reportType === "DOMAIN") {
      if (booking.seatsReferences.length > 0) {
        throw ErrorWithCode.Factory.BadRequest("Domain reporting is not available for seated events");
      }

      const isFreeDomain = await checkIfFreeEmailDomain({ email: bookerEmail });
      if (isFreeDomain) {
        throw ErrorWithCode.Factory.BadRequest("Cannot report by domain for free email providers");
      }
    }

    const additionalBookings = await this.findAdditionalBookings({
      reportType,
      bookerEmail,
      hostUserId,
    });

    const additionalUids = additionalBookings
      .filter((b) => !b.report && b.uid !== bookingUid)
      .map((b) => b.uid);

    const allBookingsToCancelUids: string[] = [];

    if (isUpcomingBooking(booking)) {
      allBookingsToCancelUids.push(bookingUid);
    }

    allBookingsToCancelUids.push(...additionalUids);

    const { cancelledUids } = await this.cancelReportedBookings({
      bookingUids: allBookingsToCancelUids,
      originalBooking: booking,
      userEmail,
      userId,
      actionSource,
      organizationId,
    });

    // For domain reports, use the domain as bookerEmail so they group together in the admin blocklist
    const reportEmail = reportType === "DOMAIN" ? `@${extractDomainFromEmail(bookerEmail)}` : bookerEmail;

    const reportUids = Array.from(new Set([bookingUid, ...additionalUids]));
    let createdCount = 0;

    for (const uid of reportUids) {
      try {
        await this.deps.bookingReportRepo.createReport({
          bookingUid: uid,
          bookerEmail: reportEmail,
          reportedById: userId,
          reason,
          description,
          cancelled: cancelledUids.has(uid),
          organizationId,
        });
        createdCount++;
      } catch (error) {
        this.log.warn(`Failed to create report for booking ${uid}:`, error);
      }
    }

    const success = createdCount > 0;
    const baseMessage = createdCount > 1 ? `${createdCount} bookings reported` : "Booking reported";

    let message = "No reports created";
    if (success && cancelledUids.size > 0) {
      message = `${baseMessage} and cancelled successfully`;
    } else if (success) {
      message = `${baseMessage} successfully`;
    }

    return {
      success,
      message,
      bookingUid,
      reportedCount: createdCount,
    };
  }

  async cancelReportedBookings(input: CancelReportedBookingsInput): Promise<CancelReportedBookingsResult> {
    const { bookingUids, originalBooking, userEmail, userId, actionSource, organizationId } = input;

    if (bookingUids.length === 0) {
      return { cancelledUids: new Set() };
    }

    let skipCrmDeletion = false;
    if (organizationId) {
      const blocklistSettings = await this.deps.organizationSettingsRepo.getBlocklistSettings(organizationId);
      skipCrmDeletion = !!blocklistSettings?.skipCrmOnBookingReport;
    }

    // For seated events, find the reporter's seat so we remove only their seat
    let seatReferenceUid: string | undefined;
    if (originalBooking.seatsReferences.length > 0) {
      const normalizedEmail = userEmail.trim().toLowerCase();
      const userSeat = originalBooking.seatsReferences.find(
        (seat: { attendee?: { email: string } | null; referenceUid?: string }) =>
          seat.attendee?.email && seat.attendee.email.trim().toLowerCase() === normalizedEmail
      );
      seatReferenceUid = userSeat?.referenceUid;
    }

    const cancellationResults = await Promise.allSettled(
      bookingUids.map((uid) =>
        handleCancelBooking({
          bookingData: {
            uid,
            cancelledBy: userEmail,
            skipCancellationReasonValidation: true,
            ...(uid === originalBooking.uid && seatReferenceUid ? { seatReferenceUid } : {}),
          },
          userId,
          actionSource,
          skipNotifications: true,
          skipCrmDeletion,
        })
      )
    );

    const cancelledUids = new Set<string>();
    cancellationResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        cancelledUids.add(bookingUids[index]);
      } else {
        this.log.error("Failed to cancel booking during spam report:", result.reason);
      }
    });

    return { cancelledUids };
  }

  async validateOrgBooking(input: {
    bookingUid: string;
    organizationId: number;
    reportType: "EMAIL" | "DOMAIN";
  }): Promise<ValidateOrgBookingResult> {
    const { bookingUid, organizationId, reportType } = input;

    const booking = await this.deps.bookingRepo.findByUidIncludeReportAndEventType({ bookingUid });

    if (!booking) {
      throw ErrorWithCode.Factory.NotFound("Booking not found");
    }

    if (!this.bookingBelongsToOrg(booking, organizationId)) {
      throw ErrorWithCode.Factory.Forbidden("Booking does not belong to this organization");
    }

    const bookerEmail = booking.attendees[0]?.email;
    if (!bookerEmail) {
      throw ErrorWithCode.Factory.BadRequest("Booking has no attendees");
    }

    if (reportType === "DOMAIN") {
      if (booking.seatsReferences.length > 0) {
        throw ErrorWithCode.Factory.BadRequest("Domain reporting is not available for seated events");
      }

      const isFreeDomain = await checkIfFreeEmailDomain({ email: bookerEmail });
      if (isFreeDomain) {
        throw ErrorWithCode.Factory.BadRequest("Cannot report by domain for free email providers");
      }
    }

    return { booking, bookerEmail };
  }

  async createReport(input: CreateBookingReportInput): Promise<void> {
    await this.deps.bookingReportRepo.createReport(input);
  }

  private bookingBelongsToOrg(booking: BookingForOrgReport, organizationId: number): boolean {
    const team = booking.eventType?.team;
    if (team && (team.id === organizationId || team.parentId === organizationId)) {
      return true;
    }

    // Personal event types: check if the host user has a profile in the organization
    if (booking.user?.profiles?.some((p) => p.organizationId === organizationId)) {
      return true;
    }

    return false;
  }

  async findUpcomingUnreportedOrgBookings({
    reportType,
    bookerEmail,
    organizationId,
  }: {
    reportType: "EMAIL" | "DOMAIN";
    bookerEmail: string;
    organizationId: number;
  }): Promise<AdditionalBooking[]> {
    if (reportType === "DOMAIN") {
      const domain = extractDomainFromEmail(bookerEmail);
      return this.deps.bookingRepo.findUpcomingUnreportedOrgBookingsByDomain({ domain, organizationId });
    }

    return this.deps.bookingRepo.findUpcomingUnreportedOrgBookingsByEmail({
      email: bookerEmail,
      organizationId,
    });
  }

  private async findAdditionalBookings({
    reportType,
    bookerEmail,
    hostUserId,
  }: {
    reportType: "EMAIL" | "DOMAIN";
    bookerEmail: string;
    hostUserId: number;
  }): Promise<AdditionalBooking[]> {
    if (reportType === "DOMAIN") {
      const domain = extractDomainFromEmail(bookerEmail);
      return this.deps.bookingRepo.findUpcomingByAttendeeDomain({ domain, hostUserId });
    }

    return this.deps.bookingRepo.findUpcomingByAttendeeEmail({
      attendeeEmail: bookerEmail,
      hostUserId,
    });
  }
}
