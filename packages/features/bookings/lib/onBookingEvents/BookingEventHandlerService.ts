import type { Logger } from "tslog";

import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { BookingAuditService, BookingAuditData } from "@calcom/lib/server/service/bookingAuditService";

import type { BookingCreatedPayload, BookingRescheduledPayload } from "./types";

interface BookingEventHandlerDeps {
  log: Logger<unknown>;
  hashedLinkService: HashedLinkService;
  bookingAuditService: BookingAuditService;
}

export class BookingEventHandlerService {
  private readonly log: BookingEventHandlerDeps["log"];
  private readonly hashedLinkService: BookingEventHandlerDeps["hashedLinkService"];
  private readonly bookingAuditService: BookingEventHandlerDeps["bookingAuditService"];

  constructor(private readonly deps: BookingEventHandlerDeps) {
    this.log = deps.log;
    this.hashedLinkService = deps.hashedLinkService;
    this.bookingAuditService = deps.bookingAuditService;
  }

  async onBookingCreated(payload: BookingCreatedPayload) {
    this.log.debug("onBookingCreated", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);

    try {
      await this.bookingAuditService.onBookingCreated(
        String(payload.booking.id),
        payload.booking.userId || payload.booking.user?.id,
        {
          booking: {
            meetingTime: payload.booking.startTime.toISOString(),
          },
        }
      );
    } catch (error) {
      this.log.error("Error while creating booking audit", safeStringify(error));
    }
  }

  async onBookingRescheduled(payload: BookingRescheduledPayload) {
    this.log.debug("onBookingRescheduled", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);
  }

  /**
   * Handles common tasks that need to be executed in both booking created and rescheduled events
   * A dedicated place because there are many tasks that need to be executed in both events.
   */
  private async onBookingCreatedOrRescheduled(payload: BookingCreatedPayload | BookingRescheduledPayload) {
    const results = await Promise.allSettled([
      // TODO: Migrate other post-booking tasks here, to execute them in parallel, without affecting each other
      this.updatePrivateLinkUsage(payload.bookingFormData.hashedLink),
    ]);
    results.forEach((result) => {
      if (result.status === "rejected") {
        this.log.error(
          "Error while executing onBookingCreatedOrRescheduled task",
          safeStringify(result.reason)
        );
      }
    });
  }

  private async updatePrivateLinkUsage(hashedLink: string | null) {
    try {
      if (hashedLink) {
        await this.deps.hashedLinkService.validateAndIncrementUsage(hashedLink);
      }
    } catch (error) {
      this.log.error("Error while updating hashed link", safeStringify(error));
    }
  }

  async onBookingAccepted(bookingId: string, userId?: number, data?: Partial<BookingAuditData>) {
    try {
      await this.bookingAuditService.onBookingAccepted(bookingId, userId, data);
    } catch (error) {
      this.log.error("Error while creating booking accepted audit", safeStringify(error));
    }
  }

  async onBookingCancelled(bookingId: string, userId?: number, data?: Partial<BookingAuditData>) {
    try {
      await this.bookingAuditService.onBookingCancelled(bookingId, userId, data);
    } catch (error) {
      this.log.error("Error while creating booking cancelled audit", safeStringify(error));
    }
  }

  async onBookingUpdated(bookingId: string, userId: number, data?: Partial<BookingAuditData>) {
    try {
      await this.bookingAuditService.onBookingUpdated(bookingId, userId, data);
    } catch (error) {
      this.log.error("Error while creating booking updated audit", safeStringify(error));
    }
  }

  async onRescheduleRequested(bookingId: string, userId: number, data?: Partial<BookingAuditData>) {
    try {
      await this.bookingAuditService.onRescheduleRequested(bookingId, userId, data);
    } catch (error) {
      this.log.error("Error while creating reschedule requested audit", safeStringify(error));
    }
  }

  async onAttendeeAdded(bookingId: string, userId: number, data?: Partial<BookingAuditData>) {
    try {
      await this.bookingAuditService.onAttendeeAdded(bookingId, userId, data);
    } catch (error) {
      this.log.error("Error while creating attendee added audit", safeStringify(error));
    }
  }

  async onHostNoShowUpdated(bookingId: string, userId: number, data?: Partial<BookingAuditData>) {
    try {
      await this.bookingAuditService.onHostNoShowUpdated(bookingId, userId, data);
    } catch (error) {
      this.log.error("Error while creating host no-show audit", safeStringify(error));
    }
  }
}
