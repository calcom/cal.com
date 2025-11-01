import type { Logger } from "tslog";

import type { BookingAuditService } from "@calcom/features/booking-audit/lib/service/BookingAuditService";
import type {
  StatusChangeAuditData,
  CancelledAuditData,
  RejectedAuditData,
  RescheduleRequestedAuditData,
  AttendeeAddedAuditData,
  AttendeeRemovedAuditData,
  CancellationReasonUpdatedAuditData,
  RejectionReasonUpdatedAuditData,
  AssignmentAuditData,
  ReassignmentAuditData,
  LocationChangedAuditData,
  MeetingUrlUpdatedAuditData,
  HostNoShowUpdatedAuditData,
  AttendeeNoShowUpdatedAuditData,
} from "@calcom/features/booking-audit/lib/types";
import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { BookingStatus } from "@calcom/prisma/enums";

import type { Actor } from "../types/actor";
import { getActorUserId } from "../types/actor";
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
      const auditData = {
        startTime: payload.booking.startTime.toISOString(),
        endTime: payload.booking.endTime.toISOString(),
        status: payload.booking.status,
      };
      const userId = payload.booking.userId ?? payload.booking.user?.id ?? undefined;
      await this.bookingAuditService.onBookingCreated(String(payload.booking.id), userId, auditData);
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

  async onBookingAccepted(bookingId: string, actor: Actor, data?: StatusChangeAuditData) {
    try {
      await this.bookingAuditService.onBookingAccepted(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating booking accepted audit", safeStringify(error));
    }
  }

  async onBookingCancelled(bookingId: string, actor: Actor, data: CancelledAuditData) {
    try {
      await this.bookingAuditService.onBookingCancelled(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating booking cancelled audit", safeStringify(error));
    }
  }

  async onRescheduleRequested(bookingId: string, actor: Actor, data: RescheduleRequestedAuditData) {
    try {
      await this.bookingAuditService.onRescheduleRequested(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating reschedule requested audit", safeStringify(error));
    }
  }

  async onAttendeeAdded(bookingId: string, actor: Actor, data: AttendeeAddedAuditData) {
    try {
      await this.bookingAuditService.onAttendeeAdded(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating attendee added audit", safeStringify(error));
    }
  }

  async onHostNoShowUpdated(bookingId: string, actor: Actor, data: HostNoShowUpdatedAuditData) {
    try {
      await this.bookingAuditService.onHostNoShowUpdated(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating host no-show audit", safeStringify(error));
    }
  }

  async onBookingRejected(bookingId: string, actor: Actor, data: RejectedAuditData) {
    try {
      await this.bookingAuditService.onBookingRejected(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating booking rejected audit", safeStringify(error));
    }
  }

  async onBookingPending(bookingId: string, actor: Actor, data?: StatusChangeAuditData) {
    try {
      await this.bookingAuditService.onBookingPending(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating booking pending audit", safeStringify(error));
    }
  }

  async onBookingAwaitingHost(bookingId: string, actor: Actor, data?: StatusChangeAuditData) {
    try {
      await this.bookingAuditService.onBookingAwaitingHost(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating booking awaiting host audit", safeStringify(error));
    }
  }

  async onBookingStatusChange(
    bookingId: string,
    actor: Actor,
    status: BookingStatus,
    data?: StatusChangeAuditData | CancelledAuditData | RejectedAuditData
  ) {
    try {
      // Route to the appropriate specific method based on status
      switch (status) {
        case "ACCEPTED": {
          // Type guard: ensure data is StatusChangeAuditData or undefined
          const statusData: StatusChangeAuditData | undefined =
            data && !("rejectionReason" in data) && !("cancellationReason" in data) ? data : undefined;
          await this.bookingAuditService.onBookingAccepted(bookingId, getActorUserId(actor), statusData);
          break;
        }
        case "REJECTED": {
          // Caller must provide RejectedAuditData for REJECTED status
          if (data && "rejectionReason" in data) {
            await this.bookingAuditService.onBookingRejected(bookingId, getActorUserId(actor), data);
          }
          break;
        }
        case "CANCELLED": {
          // Caller must provide CancelledAuditData for CANCELLED status
          if (data && "cancellationReason" in data) {
            await this.bookingAuditService.onBookingCancelled(bookingId, getActorUserId(actor), data);
          }
          break;
        }
        case "PENDING": {
          // Type guard: ensure data is StatusChangeAuditData or undefined
          const statusData: StatusChangeAuditData | undefined =
            data && !("rejectionReason" in data) && !("cancellationReason" in data) ? data : undefined;
          await this.bookingAuditService.onBookingPending(bookingId, getActorUserId(actor), statusData);
          break;
        }
        case "AWAITING_HOST": {
          // Type guard: ensure data is StatusChangeAuditData or undefined
          const statusData: StatusChangeAuditData | undefined =
            data && !("rejectionReason" in data) && !("cancellationReason" in data) ? data : undefined;
          await this.bookingAuditService.onBookingAwaitingHost(bookingId, getActorUserId(actor), statusData);
          break;
        }
      }
    } catch (error) {
      this.log.error(
        `Error while creating booking status change audit for status: ${status}`,
        safeStringify(error)
      );
    }
  }

  async onAttendeeRemoved(bookingId: string, actor: Actor, data: AttendeeRemovedAuditData) {
    try {
      await this.bookingAuditService.onAttendeeRemoved(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating attendee removed audit", safeStringify(error));
    }
  }

  async onCancellationReasonUpdated(
    bookingId: string,
    actor: Actor,
    data: CancellationReasonUpdatedAuditData
  ) {
    try {
      await this.bookingAuditService.onCancellationReasonUpdated(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating cancellation reason updated audit", safeStringify(error));
    }
  }

  async onRejectionReasonUpdated(bookingId: string, actor: Actor, data: RejectionReasonUpdatedAuditData) {
    try {
      await this.bookingAuditService.onRejectionReasonUpdated(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating rejection reason updated audit", safeStringify(error));
    }
  }

  async onAssignmentReasonUpdated(bookingId: string, actor: Actor, data: AssignmentAuditData) {
    try {
      await this.bookingAuditService.onAssignmentReasonUpdated(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating assignment reason updated audit", safeStringify(error));
    }
  }

  async onReassignmentReasonUpdated(bookingId: string, actor: Actor, data: ReassignmentAuditData) {
    try {
      await this.bookingAuditService.onReassignmentReasonUpdated(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating reassignment reason updated audit", safeStringify(error));
    }
  }

  async onLocationChanged(bookingId: string, actor: Actor, data: LocationChangedAuditData) {
    try {
      await this.bookingAuditService.onLocationChanged(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating location changed audit", safeStringify(error));
    }
  }

  async onMeetingUrlUpdated(bookingId: string, actor: Actor, data: MeetingUrlUpdatedAuditData) {
    try {
      await this.bookingAuditService.onMeetingUrlUpdated(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating meeting URL updated audit", safeStringify(error));
    }
  }

  async onAttendeeNoShowUpdated(bookingId: string, actor: Actor, data: AttendeeNoShowUpdatedAuditData) {
    try {
      await this.bookingAuditService.onAttendeeNoShowUpdated(bookingId, getActorUserId(actor), data);
    } catch (error) {
      this.log.error("Error while creating attendee no-show audit", safeStringify(error));
    }
  }
}
