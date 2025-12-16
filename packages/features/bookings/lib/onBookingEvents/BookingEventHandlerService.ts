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
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
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
  auditData: CreatedAuditData;
  source: ActionSource;
  operationId?: string | null;
}

interface OnBookingRescheduledParams {
  payload: BookingRescheduledPayload;
  actor: Actor;
  auditData: RescheduledAuditData;
  source: ActionSource;
  operationId?: string | null;
}

interface BaseBookingEventParams<TAuditData> {
  bookingUid: string;
  actor: Actor;
  organizationId: number | null;
  auditData: TAuditData;
  source: ActionSource;
  operationId?: string | null;
}

type OnBookingAcceptedParams = BaseBookingEventParams<AcceptedAuditData>;
type OnBookingCancelledParams = BaseBookingEventParams<CancelledAuditData>;
type OnRescheduleRequestedParams = BaseBookingEventParams<RescheduleRequestedAuditData>;
type OnAttendeeAddedParams = BaseBookingEventParams<AttendeeAddedAuditData>;
type OnHostNoShowUpdatedParams = BaseBookingEventParams<HostNoShowUpdatedAuditData>;
type OnBookingRejectedParams = BaseBookingEventParams<RejectedAuditData>;
type OnAttendeeRemovedParams = BaseBookingEventParams<AttendeeRemovedAuditData>;
type OnReassignmentParams = BaseBookingEventParams<ReassignmentAuditData>;
type OnLocationChangedParams = BaseBookingEventParams<LocationChangedAuditData>;
type OnAttendeeNoShowUpdatedParams = BaseBookingEventParams<AttendeeNoShowUpdatedAuditData>;
type OnSeatBookedParams = BaseBookingEventParams<SeatBookedAuditData>;
type OnSeatRescheduledParams = BaseBookingEventParams<SeatRescheduledAuditData>;

export class BookingEventHandlerService {
  private readonly log: BookingEventHandlerDeps["log"];
  private readonly bookingAuditProducerService: BookingEventHandlerDeps["bookingAuditProducerService"];

  constructor(private readonly deps: BookingEventHandlerDeps) {
    this.log = deps.log;
    this.bookingAuditProducerService = deps.bookingAuditProducerService;
  }

  async onBookingCreated(params: OnBookingCreatedParams) {
    const { payload, actor, auditData, source, operationId } = params;
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
      operationId,
      data: auditData,
    });
  }

  async onBookingRescheduled(params: OnBookingRescheduledParams) {
    const { payload, actor, auditData, source, operationId } = params;
    this.log.debug("onBookingRescheduled", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);

    await this.bookingAuditProducerService.queueRescheduledAudit({
      // In case of rescheduled booking, we send old booking uid because the action took place on that booking only
      bookingUid: payload.oldBooking.uid,
      actor,
      organizationId: payload.organizationId,
      source,
      operationId,
      data: auditData,
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
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueAcceptedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onBookingCancelled(params: OnBookingCancelledParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueCancelledAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onRescheduleRequested(params: OnRescheduleRequestedParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueRescheduleRequestedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onAttendeeAdded(params: OnAttendeeAddedParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueAttendeeAddedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onHostNoShowUpdated(params: OnHostNoShowUpdatedParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueHostNoShowUpdatedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onBookingRejected(params: OnBookingRejectedParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueRejectedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onAttendeeRemoved(params: OnAttendeeRemovedParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueAttendeeRemovedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onReassignment(params: OnReassignmentParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueReassignmentAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onLocationChanged(params: OnLocationChangedParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueLocationChangedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onAttendeeNoShowUpdated(params: OnAttendeeNoShowUpdatedParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueAttendeeNoShowUpdatedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onSeatBooked(params: OnSeatBookedParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueSeatBookedAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  async onSeatRescheduled(params: OnSeatRescheduledParams) {
    const { bookingUid, actor, organizationId, auditData, source, operationId } = params;
    await this.bookingAuditProducerService.queueSeatRescheduledAudit({
      bookingUid,
      actor,
      organizationId,
      source,
      operationId,
      data: auditData,
    });
  }

  /**
   * Handles bulk booking acceptance for recurring bookings
   * Creates a single task that will be processed to create multiple audit logs atomically
   */
  async onBulkBookingsAccepted(params: {
    bookings: Array<{
      bookingUid: string;
      auditData: AcceptedAuditData;
    }>;
    actor: Actor;
    organizationId: number | null;
    operationId?: string | null;
    source: ActionSource;
  }) {
    const { bookings, actor, organizationId, operationId, source } = params;
    await this.bookingAuditProducerService.queueBulkAcceptedAudit({
      bookings: bookings.map((booking) => ({
        bookingUid: booking.bookingUid,
        data: booking.auditData,
      })),
      actor,
      organizationId,
      source,
      operationId,
    });
  }

  /**
   * Handles bulk booking cancellation for recurring bookings
   * Creates a single task that will be processed to create multiple audit logs atomically
   */
  async onBulkBookingsCancelled(params: {
    bookings: Array<{
      bookingUid: string;
      auditData: CancelledAuditData;
    }>;
    actor: Actor;
    organizationId: number | null;
    operationId?: string | null;
    source: ActionSource;
  }) {
    const { bookings, actor, organizationId, operationId, source } = params;
    await this.bookingAuditProducerService.queueBulkCancelledAudit({
      bookings: bookings.map((booking) => ({
        bookingUid: booking.bookingUid,
        data: booking.auditData,
      })),
      actor,
      organizationId,
      source,
      operationId,
    });
  }
}
