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
import type { SeatBookedAuditData } from "@calcom/features/booking-audit/lib/actions/SeatBookedAuditActionService";
import type { SeatRescheduledAuditData } from "@calcom/features/booking-audit/lib/actions/SeatRescheduledAuditActionService";
import type { CreatedAuditData } from "@calcom/features/booking-audit/lib/actions/CreatedAuditActionService";
import type { RescheduledAuditData } from "@calcom/features/booking-audit/lib/actions/RescheduledAuditActionService";
import type { ActionSource } from "@calcom/features/booking-audit/lib/common/actionSource";
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

interface OnBookingCreatedParams {
  payload: BookingCreatedPayload;
  actor: Actor;
  data: CreatedAuditData;
  source: ActionSource;
}

interface OnBookingRescheduledParams {
  payload: BookingRescheduledPayload;
  actor: Actor;
  data: RescheduledAuditData;
  source: ActionSource;
}

interface OnBookingAcceptedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: AcceptedAuditData;
  source: ActionSource;
}

interface OnBookingCancelledParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: CancelledAuditData;
  source: ActionSource;
}

interface OnRescheduleRequestedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: RescheduleRequestedAuditData;
  source: ActionSource;
}

interface OnAttendeeAddedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: AttendeeAddedAuditData;
  source: ActionSource;
}

interface OnHostNoShowUpdatedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: HostNoShowUpdatedAuditData;
  source: ActionSource;
}

interface OnBookingRejectedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: RejectedAuditData;
  source: ActionSource;
}

interface OnAttendeeRemovedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: AttendeeRemovedAuditData;
  source: ActionSource;
}

interface OnReassignmentParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: ReassignmentAuditData;
  source: ActionSource;
}

interface OnLocationChangedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: LocationChangedAuditData;
  source: ActionSource;
}

interface OnAttendeeNoShowUpdatedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: AttendeeNoShowUpdatedAuditData;
  source: ActionSource;
}

interface OnSeatBookedParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: SeatBookedAuditData;
  source: ActionSource;
}

interface OnSeatRescheduledParams {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  data: SeatRescheduledAuditData;
  source: ActionSource;
}

export class BookingEventHandlerService {
  private readonly log: BookingEventHandlerDeps["log"];
  private readonly bookingAuditProducerService: BookingEventHandlerDeps["bookingAuditProducerService"];

  constructor(private readonly deps: BookingEventHandlerDeps) {
    this.log = deps.log;
    this.bookingAuditProducerService = deps.bookingAuditProducerService;
  }

  async onBookingCreated(params: OnBookingCreatedParams) {
    const { payload, actor, data, source } = params;
    this.log.debug("onBookingCreated", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);
    await this.deps.bookingAuditProducerService.queueCreatedAudit({
      bookingUid: payload.booking.uid,
      actor,
      organizationId: payload.organizationId,
      source,
      data,
    });
  }

  async onBookingRescheduled(params: OnBookingRescheduledParams) {
    const { payload, actor, data, source } = params;
    this.log.debug("onBookingRescheduled", safeStringify(payload));
    await this.onBookingCreatedOrRescheduled(payload);

    await this.bookingAuditProducerService.queueRescheduledAudit({
      // In case of rescheduled booking, we send old booking uid because the action took place on that booking only
      bookingUid: payload.oldBooking.uid,
      actor,
      organizationId: payload.organizationId,
      source,
      data,
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

  async onBookingAccepted(params: OnBookingAcceptedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueAcceptedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onBookingCancelled(params: OnBookingCancelledParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueCancelledAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onRescheduleRequested(params: OnRescheduleRequestedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueRescheduleRequestedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onAttendeeAdded(params: OnAttendeeAddedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueAttendeeAddedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onHostNoShowUpdated(params: OnHostNoShowUpdatedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueHostNoShowUpdatedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onBookingRejected(params: OnBookingRejectedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueRejectedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onAttendeeRemoved(params: OnAttendeeRemovedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueAttendeeRemovedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onReassignment(params: OnReassignmentParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueReassignmentAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onLocationChanged(params: OnLocationChangedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueLocationChangedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onAttendeeNoShowUpdated(params: OnAttendeeNoShowUpdatedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueAttendeeNoShowUpdatedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onSeatBooked(params: OnSeatBookedParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueSeatBookedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }

  async onSeatRescheduled(params: OnSeatRescheduledParams) {
    const { bookingUid, actor, organizationId, data, source } = params;
    await this.bookingAuditProducerService.queueSeatRescheduledAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      data,
    });
  }
}
