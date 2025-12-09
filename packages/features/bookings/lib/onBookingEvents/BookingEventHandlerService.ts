import type { BookingAuditProducerService } from "@calcom/features/booking-audit/lib/service/BookingAuditProducerService.interface";
import type { AcceptedAuditData } from "@calcom/features/booking-audit/lib/actions/AcceptedAuditActionService";
import type { CancelledAuditData } from "@calcom/features/booking-audit/lib/actions/CancelledAuditActionService";
import type { RejectedAuditData } from "@calcom/features/booking-audit/lib/actions/RejectedAuditActionService";
import type { RescheduleRequestedAuditData } from "@calcom/features/booking-audit/lib/actions/RescheduleRequestedAuditActionService";
import type { AttendeeAddedAuditData } from "@calcom/features/booking-audit/lib/actions/AttendeeAddedAuditActionService";
import type { AttendeeRemovedAuditData } from "@calcom/features/booking-audit/lib/actions/AttendeeRemovedAuditActionService";
import type { ReassignmentAuditData } from "@calcom/features/booking-audit/lib/actions/ReassignmentAuditActionService";
import type { LocationChangedAuditData } from "@calcom/features/booking-audit/lib/actions/LocationChangedAuditActionService";
import type { HostNoShowUpdatedAuditData } from "@calcom/features/booking-audit/lib/actions/HostNoShowUpdatedAuditActionService";
import type { AttendeeNoShowUpdatedAuditData } from "@calcom/features/booking-audit/lib/actions/AttendeeNoShowUpdatedAuditActionService";
import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Actor } from "../types/actor";
import type { BookingCreatedPayload, BookingRescheduledPayload } from "./types";

interface BookingEventHandlerDeps {
  log: ISimpleLogger;
  hashedLinkService: HashedLinkService;
  bookingAuditProducerService: BookingAuditProducerService;
}

export class BookingEventHandlerService {
  private readonly log: BookingEventHandlerDeps["log"];
  private readonly bookingAuditProducerService: BookingEventHandlerDeps["bookingAuditProducerService"];

  constructor(private readonly deps: BookingEventHandlerDeps) {
    this.log = deps.log;
    this.bookingAuditProducerService = deps.bookingAuditProducerService;
  }

  async onBookingCreated(payload: BookingCreatedPayload, actor: Actor) {
    this.log.debug("onBookingCreated", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);
    await this.deps.bookingAuditProducerService.queueCreatedAudit({
      bookingUid: payload.booking.uid,
      actor,
      organizationId: payload.organizationId,
      data: {
        startTime: payload.booking.startTime.getTime(),
        endTime: payload.booking.endTime.getTime(),
        status: payload.booking.status,
      },
    });
  }

  async onBookingRescheduled(payload: BookingRescheduledPayload, actor: Actor) {
    this.log.debug("onBookingRescheduled", safeStringify(payload));
    await this.onBookingCreatedOrRescheduled(payload);

    await this.bookingAuditProducerService.queueRescheduledAudit({
      // In case of rescheduled booking, we send old booking uid because the action took place on that booking only
      bookingUid: payload.oldBooking.uid,
      actor,
      organizationId: payload.organizationId,
      data: {
        startTime: {
          old: payload.oldBooking?.startTime.toISOString() ?? null,
          new: payload.booking.startTime.toISOString(),
        },
        endTime: {
          old: payload.oldBooking?.endTime.toISOString() ?? null,
          new: payload.booking.endTime.toISOString(),
        },
        rescheduledToUid: {
          old: null,
          new: payload.booking.uid,
        },
      },
    });
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

  async onBookingAccepted(bookingUid: string, actor: Actor, organizationId: number | null, data: AcceptedAuditData) {
    await this.bookingAuditProducerService.queueAcceptedAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onBookingCancelled(bookingUid: string, actor: Actor, organizationId: number | null, data: CancelledAuditData) {
    await this.bookingAuditProducerService.queueCancelledAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onRescheduleRequested(bookingUid: string, actor: Actor, organizationId: number | null, data: RescheduleRequestedAuditData) {
    await this.bookingAuditProducerService.queueRescheduleRequestedAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onAttendeeAdded(bookingUid: string, actor: Actor, organizationId: number | null, data: AttendeeAddedAuditData) {
    await this.bookingAuditProducerService.queueAttendeeAddedAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onHostNoShowUpdated(bookingUid: string, actor: Actor, organizationId: number | null, data: HostNoShowUpdatedAuditData) {
    await this.bookingAuditProducerService.queueHostNoShowUpdatedAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onBookingRejected(bookingUid: string, actor: Actor, organizationId: number | null, data: RejectedAuditData) {
    await this.bookingAuditProducerService.queueRejectedAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onAttendeeRemoved(bookingUid: string, actor: Actor, organizationId: number | null, data: AttendeeRemovedAuditData) {
    await this.bookingAuditProducerService.queueAttendeeRemovedAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onReassignment(bookingUid: string, actor: Actor, organizationId: number | null, data: ReassignmentAuditData) {
    await this.bookingAuditProducerService.queueReassignmentAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onLocationChanged(bookingUid: string, actor: Actor, organizationId: number | null, data: LocationChangedAuditData) {
    await this.bookingAuditProducerService.queueLocationChangedAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }

  async onAttendeeNoShowUpdated(bookingUid: string, actor: Actor, organizationId: number | null, data: AttendeeNoShowUpdatedAuditData) {
    await this.bookingAuditProducerService.queueAttendeeNoShowUpdatedAudit({
      bookingUid,
      actor,
      organizationId,
      data,
    });
  }
}
